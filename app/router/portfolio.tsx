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
  current_price: number;
  market_cap: string;
  week_52_high: number;
  week_52_low: number;
  volume: number;
} | null;

type CompanyInfoData = {
  name: string;
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
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
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

      const priceData = response.output?.value as StockPriceData;

      // Check if we got valid price data
      if (!priceData || !priceData.current_price || priceData.current_price <= 0) {
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

    // Upsert holding (update if exists, create if not)
    const holding = await prisma.portfolioHolding.upsert({
      where: {
        portfolioId_ticker: {
          portfolioId: portfolio.id,
          ticker: input.ticker,
        },
      },
      update: {
        quantity: input.quantity,
        purchasePrice: input.purchasePrice,
        purchaseDate: new Date(input.purchaseDate),
      },
      create: {
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

      const priceData = priceResponse.output?.value as StockPriceData;
      const companyData = companyResponse.output?.value as CompanyInfoData;

      return {
        ticker: input.ticker,
        currentPrice: priceData?.current_price ?? null,
        marketCap: priceData?.market_cap ?? null,
        companyName: companyData?.name ?? null,
        sector: companyData?.sector ?? null,
        industry: companyData?.industry ?? null,
      };
    } catch {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Failed to fetch details for ticker: ${input.ticker}`,
      });
    }
  });
