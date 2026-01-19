import Arcade from "@arcadeai/arcadejs";
import { ORPCError } from "@orpc/server";

import { env } from "@/lib/env";

import { authorized } from "../middlewares/auth";
import {
  addHoldingSchema,
  createPortfolioSchema,
  getHoldingDetailsSchema,
  removeHoldingSchema,
  updatePortfolioSchema,
} from "../schemas/portfolio";
import prisma from "@/lib/db";

const arcadeClient = new Arcade({ apiKey: env.ARCADE_API_KEY });

// Types for MCP responses
type StockPriceData = {
  ticker: string;
  price: number;
  previous_close: number;
  change_percent: number;
  market_cap: number;
  fifty_two_week_high: number;
  fifty_two_week_low: number;
  currency: string;
  volume: number;
} | null;

type CompanyInfoData = {
  ticker: string;
  company_name: string;
  sector: string;
  industry: string;
  description: string;
  website: string;
  employees: number;
  city: string;
  state: string;
  country: string;
} | null;

// Demo portfolio sample data
const DEMO_HOLDINGS = [
  {
    ticker: "AAPL",
    quantity: 50,
    purchasePrice: 150.0,
    purchaseDate: new Date("2024-01-15"),
  },
  {
    ticker: "GOOGL",
    quantity: 20,
    purchasePrice: 140.0,
    purchaseDate: new Date("2024-02-01"),
  },
  {
    ticker: "MSFT",
    quantity: 30,
    purchasePrice: 380.0,
    purchaseDate: new Date("2024-01-20"),
  },
  {
    ticker: "TSLA",
    quantity: 15,
    purchasePrice: 200.0,
    purchaseDate: new Date("2024-03-01"),
  },
  {
    ticker: "NVDA",
    quantity: 25,
    purchasePrice: 450.0,
    purchaseDate: new Date("2024-02-15"),
  },
];

// Get user's portfolio with holdings
export const getPortfolio = authorized
  .route({
    path: "/portfolio/get",
    method: "GET",
    summary: "Get user's portfolio with holdings",
  })
  .handler(async ({ context }) => {
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: context.user.id },
      include: {
        holdings: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return { portfolio };
  });

// Create portfolio
export const createPortfolio = authorized
  .route({
    path: "/portfolio/create",
    method: "POST",
    summary: "Create a new portfolio",
  })
  .input(createPortfolioSchema)
  .handler(async ({ context, input }) => {
    // Check if user already has a portfolio
    const existingPortfolio = await prisma.portfolio.findFirst({
      where: { userId: context.user.id },
    });

    if (existingPortfolio) {
      throw new ORPCError("BAD_REQUEST", {
        message: "You already have a portfolio. Delete it first to create a new one.",
      });
    }

    // Create portfolio with optional demo holdings
    const portfolio = await prisma.portfolio.create({
      data: {
        userId: context.user.id,
        name: input.isDemo ? "Demo Portfolio" : input.name,
        description: input.isDemo
          ? "A demo portfolio with sample holdings"
          : input.description,
        ...(input.isDemo && {
          holdings: {
            create: DEMO_HOLDINGS,
          },
        }),
      },
      include: {
        holdings: true,
      },
    });

    return { portfolio };
  });

// Update portfolio name/description
export const updatePortfolio = authorized
  .route({
    path: "/portfolio/update",
    method: "POST",
    summary: "Update portfolio name or description",
  })
  .input(updatePortfolioSchema)
  .handler(async ({ context, input }) => {
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: context.user.id },
    });

    if (!portfolio) {
      throw new ORPCError("NOT_FOUND", {
        message: "Portfolio not found",
      });
    }

    const updated = await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        name: input.name,
        description: input.description,
      },
    });

    return { portfolio: updated };
  });

// Delete portfolio
export const deletePortfolio = authorized
  .route({
    path: "/portfolio/delete",
    method: "POST",
    summary: "Delete portfolio (cascade deletes holdings and reports)",
  })
  .handler(async ({ context }) => {
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: context.user.id },
    });

    if (!portfolio) {
      throw new ORPCError("NOT_FOUND", {
        message: "Portfolio not found",
      });
    }

    await prisma.portfolio.delete({
      where: { id: portfolio.id },
    });

    return { success: true };
  });

// Add or update holding
export const addHolding = authorized
  .route({
    path: "/portfolio/add-holding",
    method: "POST",
    summary: "Add or update a portfolio holding",
  })
  .input(addHoldingSchema)
  .handler(async ({ context, input }) => {
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: context.user.id },
    });

    if (!portfolio) {
      throw new ORPCError("NOT_FOUND", {
        message: "Portfolio not found. Create a portfolio first.",
      });
    }


    // Validate ticker exists by calling Financial MCP
    const userId = context.user.email ?? context.user.id;
    try {
      const response = await arcadeClient.tools.execute({
        tool_name: "FinancialMcp.GetStockPrice@1.0.0",
        input: { ticker: input.ticker },
        user_id: userId,
      });

      // Parse the JSON string response
      const priceData = typeof response.output?.value === 'string'
        ? JSON.parse(response.output.value) as StockPriceData
        : response.output?.value as StockPriceData;

      // Check if we got valid price data
      if (!priceData || !priceData.price || priceData.price <= 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: `Invalid ticker symbol: ${input.ticker}. Please check the symbol and try again.`,
        });
      }
    } catch (error) {
      // If it's already an ORPCError, rethrow it
      if (error instanceof ORPCError) {
        throw error;
      }
      // Otherwise, wrap it in a generic error
      throw new ORPCError("BAD_REQUEST", {
        message: `Failed to verify ticker: ${input.ticker}. Please check the symbol and try again.`,
      });
    }

    // Check if holding already exists
    const existingHolding = await prisma.portfolioHolding.findUnique({
      where: {
        portfolioId_ticker: {
          portfolioId: portfolio.id,
          ticker: input.ticker,
        },
      },
    });

    if (existingHolding) {
      throw new ORPCError("BAD_REQUEST", {
        message: `You already have a holding for ${input.ticker}. Delete it first to add a new one.`,
      });
    }

    // Create new holding
    const holding = await prisma.portfolioHolding.create({
      data: {
        portfolioId: portfolio.id,
        ticker: input.ticker,
        quantity: input.quantity,
        purchasePrice: input.purchasePrice,
        purchaseDate: new Date(input.purchaseDate),
      },
    });

    return { holding };
  });

// Remove holding
export const removeHolding = authorized
  .route({
    path: "/portfolio/remove-holding",
    method: "POST",
    summary: "Remove a holding from portfolio",
  })
  .input(removeHoldingSchema)
  .handler(async ({ context, input }) => {
    // Verify the holding belongs to user's portfolio
    const holding = await prisma.portfolioHolding.findUnique({
      where: { id: input.holdingId },
      include: { portfolio: true },
    });

    if (!holding) {
      throw new ORPCError("NOT_FOUND", {
        message: "Holding not found",
      });
    }

    if (holding.portfolio.userId !== context.user.id) {
      throw new ORPCError("FORBIDDEN", {
        message: "You don't have permission to delete this holding",
      });
    }

    await prisma.portfolioHolding.delete({
      where: { id: input.holdingId },
    });

    return { success: true };
  });

// Get holding details (current price and company info)
export const getHoldingDetails = authorized
  .route({
    path: "/portfolio/holding-details",
    method: "POST",
    summary: "Get current price and company info for a ticker",
  })
  .input(getHoldingDetailsSchema)
  .handler(async ({ context, input }) => {
    const userId = context.user.email ?? context.user.id;

    try {
      // Fetch stock price and company info in parallel
      const [priceResponse, companyResponse] = await Promise.all([
        arcadeClient.tools.execute({
          tool_name: "FinancialMcp.GetStockPrice@1.0.0",
          input: { ticker: input.ticker },
          user_id: userId,
        }),
        arcadeClient.tools.execute({
          tool_name: "FinancialMcp.GetCompanyInfo@1.0.0",
          input: { ticker: input.ticker },
          user_id: userId,
        }),
      ]);

      // Parse the JSON string responses
      const priceData = typeof priceResponse.output?.value === 'string'
        ? JSON.parse(priceResponse.output.value) as StockPriceData
        : priceResponse.output?.value as StockPriceData;

      const companyData = typeof companyResponse.output?.value === 'string'
        ? JSON.parse(companyResponse.output.value) as CompanyInfoData
        : companyResponse.output?.value as CompanyInfoData;

      return {
        ticker: input.ticker,
        currentPrice: priceData?.price ?? null,
        marketCap: priceData?.market_cap ? String(priceData.market_cap) : null,
        companyName: companyData?.company_name ?? null,
        sector: companyData?.sector ?? null,
        industry: companyData?.industry ?? null,
      };
    } catch {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Failed to fetch details for ticker: ${input.ticker}`,
      });
    }
  });

// Get dashboard data with current prices and metrics
export const getDashboard = authorized
  .route({
    path: "/portfolio/dashboard",
    method: "GET",
    summary: "Get portfolio dashboard with current prices and calculated metrics",
  })
  .handler(async ({ context }) => {
    // Get portfolio with holdings
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: context.user.id },
      include: {
        holdings: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!portfolio) {
      return {
        portfolio: null,
        holdings: [],
        metrics: {
          totalValue: null,
          totalPurchaseValue: 0,
          totalGainLoss: null,
          totalGainLossPercent: null,
          holdingsCount: 0,
          bestPerformer: null,
          worstPerformer: null,
        },
        performanceData: [],
      };
    }

    const userId = context.user.email ?? context.user.id;

    // Fetch current prices for all holdings in parallel
    const holdingsWithPrices = await Promise.all(
      portfolio.holdings.map(async (holding) => {
        try {
          const [priceResponse, companyResponse] = await Promise.all([
            arcadeClient.tools.execute({
              tool_name: "FinancialMcp.GetStockPrice@1.0.0",
              input: { ticker: holding.ticker },
              user_id: userId,
            }),
            arcadeClient.tools.execute({
              tool_name: "FinancialMcp.GetCompanyInfo@1.0.0",
              input: { ticker: holding.ticker },
              user_id: userId,
            }),
          ]);

          // Parse the JSON string responses
          const priceData = typeof priceResponse.output?.value === 'string'
            ? JSON.parse(priceResponse.output.value) as StockPriceData
            : priceResponse.output?.value as StockPriceData;

          const companyData = typeof companyResponse.output?.value === 'string'
            ? JSON.parse(companyResponse.output.value) as CompanyInfoData
            : companyResponse.output?.value as CompanyInfoData;

          const currentPrice = priceData?.price ?? null;

          // Calculate holding metrics
          const purchaseValue = holding.purchasePrice * holding.quantity;
          const currentValue = currentPrice
            ? currentPrice * holding.quantity
            : null;
          const gainLoss = currentValue ? currentValue - purchaseValue : null;
          const gainLossPercent = gainLoss
            ? (gainLoss / purchaseValue) * 100
            : null;

          return {
            id: holding.id,
            ticker: holding.ticker,
            quantity: holding.quantity,
            purchasePrice: holding.purchasePrice,
            purchaseDate: holding.purchaseDate,
            currentPrice,
            currentValue,
            gainLoss,
            gainLossPercent,
            companyName: companyData?.company_name ?? null,
          };
        } catch (error) {
          console.error(
            `Failed to fetch price for ${holding.ticker}:`,
            error
          );
          return {
            id: holding.id,
            ticker: holding.ticker,
            quantity: holding.quantity,
            purchasePrice: holding.purchasePrice,
            purchaseDate: holding.purchaseDate,
            currentPrice: null,
            currentValue: null,
            gainLoss: null,
            gainLossPercent: null,
            companyName: null,
          };
        }
      })
    );

    // Calculate portfolio-level metrics
    // Only include holdings with valid current prices in calculations
    const validHoldings = holdingsWithPrices.filter((h) => h.currentValue !== null);

    const totalPurchaseValue = validHoldings.reduce(
      (sum, h) => sum + h.purchasePrice * h.quantity,
      0
    );

    const totalValue = validHoldings.length > 0
      ? validHoldings.reduce((sum, h) => sum + (h.currentValue ?? 0), 0)
      : null;

    const totalGainLoss =
      totalValue !== null ? totalValue - totalPurchaseValue : null;

    const totalGainLossPercent =
      totalGainLoss !== null && totalPurchaseValue > 0
        ? (totalGainLoss / totalPurchaseValue) * 100
        : null;

    // Fetch historical data for performance chart
    const earliestPurchaseDate = portfolio.holdings.reduce(
      (earliest, holding) =>
        holding.purchaseDate < earliest ? holding.purchaseDate : earliest,
      portfolio.holdings[0]?.purchaseDate ?? new Date()
    );

    // Determine the period based on how long ago the earliest purchase was
    const daysSincePurchase = Math.floor(
      (Date.now() - earliestPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const historicalPeriod = daysSincePurchase > 730 ? "2y" : daysSincePurchase > 365 ? "1y" : daysSincePurchase > 180 ? "6mo" : daysSincePurchase > 90 ? "3mo" : "1mo";

    // Fetch historical prices for all holdings in parallel
    const historicalDataResults = await Promise.all(
      portfolio.holdings.map(async (holding) => {
        try {
          const response = await arcadeClient.tools.execute({
            tool_name: "FinancialMcp.GetHistoricalPrices@1.0.0",
            input: {
              ticker: holding.ticker,
              period: historicalPeriod,
            },
            user_id: userId,
          });

          const historicalData = typeof response.output?.value === 'string'
            ? JSON.parse(response.output.value)
            : response.output?.value;

          // Extract the prices array from the response
          const prices = historicalData?.prices || [];

          return {
            ticker: holding.ticker,
            quantity: holding.quantity,
            purchasePrice: holding.purchasePrice,
            purchaseDate: holding.purchaseDate,
            historicalPrices: Array.isArray(prices) ? prices : [],
          };
        } catch (error) {
          console.error(`Failed to fetch historical data for ${holding.ticker}:`, error);
          return {
            ticker: holding.ticker,
            quantity: holding.quantity,
            purchasePrice: holding.purchasePrice,
            purchaseDate: holding.purchaseDate,
            historicalPrices: [],
          };
        }
      })
    );

    // Build performance data points (monthly)
    // Create a map of dates to portfolio values
    const performanceMap = new Map<string, { portfolioValue: number; purchaseValue: number }>();

    historicalDataResults.forEach((holding) => {
      holding.historicalPrices.forEach((dataPoint: { date: string; close_price?: number }) => {
        const date = dataPoint.date;
        const price = dataPoint.close_price;

        // Only include this holding's value if it was owned at this date
        const holdingOwnedAtDate = new Date(date) >= new Date(holding.purchaseDate);

        if (holdingOwnedAtDate && price) {
          const currentEntry = performanceMap.get(date) || { portfolioValue: 0, purchaseValue: 0 };
          currentEntry.portfolioValue += price * holding.quantity;
          currentEntry.purchaseValue += holding.purchasePrice * holding.quantity;
          performanceMap.set(date, currentEntry);
        }
      });
    });

    // Convert map to sorted array
    const performanceData = Array.from(performanceMap.entries())
      .map(([date, values]) => ({
        date,
        portfolioValue: values.portfolioValue,
        purchaseValue: values.purchaseValue,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Find best and worst performers
    const holdingsWithGains = holdingsWithPrices.filter(
      (h) => h.gainLossPercent !== null
    );

    const bestPerformer =
      holdingsWithGains.length > 0
        ? holdingsWithGains.reduce((best, current) =>
          (current.gainLossPercent ?? 0) > (best.gainLossPercent ?? 0)
            ? current
            : best
        )
        : null;

    const worstPerformer =
      holdingsWithGains.length > 0
        ? holdingsWithGains.reduce((worst, current) =>
          (current.gainLossPercent ?? 0) < (worst.gainLossPercent ?? 0)
            ? current
            : worst
        )
        : null;

    return {
      portfolio: {
        id: portfolio.id,
        name: portfolio.name,
        description: portfolio.description,
      },
      holdings: holdingsWithPrices,
      metrics: {
        totalValue,
        totalPurchaseValue,
        totalGainLoss,
        totalGainLossPercent,
        holdingsCount: holdingsWithPrices.length,
        bestPerformer: bestPerformer
          ? {
            ticker: bestPerformer.ticker,
            gainLossPercent: bestPerformer.gainLossPercent ?? 0,
          }
          : null,
        worstPerformer: worstPerformer
          ? {
            ticker: worstPerformer.ticker,
            gainLossPercent: worstPerformer.gainLossPercent ?? 0,
          }
          : null,
      },
      performanceData,
    };
  });
