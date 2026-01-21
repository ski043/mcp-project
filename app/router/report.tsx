import { ORPCError, streamToEventIterator } from "@orpc/server";
import { generateText, streamText } from "ai";
import Arcade from "@arcadeai/arcadejs";

import prisma from "@/lib/db";
import { env } from "@/lib/env";
import { AVAILABLE_MODELS } from "@/lib/ai-models";
import { authorized } from "../middlewares/auth";
import {
  generateReportSchema,
  initiateReportSchema,
  streamReportSchema,
  getReportSchema,
  deleteReportSchema,
  publishReportSchema,
} from "../schemas/report";

const arcadeClient = new Arcade({ apiKey: env.ARCADE_API_KEY });

// Type definitions
interface NewsArticle {
  title: string;
  publisher: string;
  link: string;
  publish_time: string;
}

interface ArcadeOutputValue {
  url?: string;
  document_url?: string;
  [key: string]: unknown;
}

// ============================================================================
// GENERATE REPORT - Core Agent Loop
// ============================================================================

export const generateReport = authorized
  .route({
    path: "/report/generate",
    method: "POST",
    summary: "Generate comprehensive portfolio analysis report",
  })
  .input(generateReportSchema)
  .handler(async ({ context, input }) => {
    // Step 1: Fetch portfolio with holdings
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: context.user.id },
      include: { holdings: true },
    });

    if (!portfolio || portfolio.holdings.length === 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Portfolio not found or has no holdings. Add holdings first.",
      });
    }

    const userId = context.user.email ?? context.user.id;

    // Step 2: Fetch all MCP data in parallel for each holding
    console.log(`Fetching data for ${portfolio.holdings.length} holdings...`);

    const holdingsData = await Promise.all(
      portfolio.holdings.map(async (holding) => {
        try {
          const [priceRes, companyRes, newsRes, histRes] = await Promise.all([
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
            arcadeClient.tools.execute({
              tool_name: "FinancialMcp.GetCompanyNews@1.0.0",
              input: { ticker: holding.ticker, max_articles: 5 },
              user_id: userId,
            }),
            arcadeClient.tools.execute({
              tool_name: "FinancialMcp.GetHistoricalPrices@1.0.0",
              input: { ticker: holding.ticker, period: "3mo" },
              user_id: userId,
            }),
          ]);

          // Parse responses
          const priceData =
            typeof priceRes.output?.value === "string"
              ? JSON.parse(priceRes.output.value)
              : priceRes.output?.value;

          const companyData =
            typeof companyRes.output?.value === "string"
              ? JSON.parse(companyRes.output.value)
              : companyRes.output?.value;

          const newsData =
            typeof newsRes.output?.value === "string"
              ? JSON.parse(newsRes.output.value)
              : newsRes.output?.value;

          const historicalData =
            typeof histRes.output?.value === "string"
              ? JSON.parse(histRes.output.value)
              : histRes.output?.value;

          // Calculate metrics
          const currentPrice = priceData?.price ?? null;
          const purchaseValue = holding.purchasePrice * holding.quantity;
          const currentValue = currentPrice
            ? currentPrice * holding.quantity
            : null;
          const gainLoss = currentValue ? currentValue - purchaseValue : null;
          const gainLossPercent = gainLoss
            ? (gainLoss / purchaseValue) * 100
            : null;

          return {
            ticker: holding.ticker,
            quantity: holding.quantity,
            purchasePrice: holding.purchasePrice,
            purchaseDate: holding.purchaseDate,
            currentPrice,
            currentValue,
            gainLoss,
            gainLossPercent,
            companyInfo: companyData,
            news: newsData?.articles || [],
            historicalPrices: historicalData?.prices || [],
          };
        } catch (error) {
          console.error(`Failed to fetch data for ${holding.ticker}:`, error);
          return null;
        }
      })
    );

    const validHoldings = holdingsData.filter((h) => h !== null);

    if (validHoldings.length === 0) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          "Failed to fetch data for any holdings. Please try again later.",
      });
    }

    // Step 3: Calculate portfolio-level metrics
    const totalPurchaseValue = validHoldings.reduce(
      (sum, h) => sum + h.purchasePrice * h.quantity,
      0
    );
    const totalCurrentValue = validHoldings.reduce(
      (sum, h) => sum + (h.currentValue || 0),
      0
    );
    const totalGainLoss = totalCurrentValue - totalPurchaseValue;
    const totalGainLossPercent = totalPurchaseValue > 0
      ? (totalGainLoss / totalPurchaseValue) * 100
      : 0;

    // Find best and worst performers
    const sortedByPerformance = [...validHoldings].sort(
      (a, b) => (b.gainLossPercent || 0) - (a.gainLossPercent || 0)
    );
    const bestPerformer = sortedByPerformance[0];
    const worstPerformer = sortedByPerformance[sortedByPerformance.length - 1];

    // Step 4: Build comprehensive prompt
    const systemPrompt = `You are a financial analyst generating a comprehensive portfolio analysis report.

Your goal is to provide actionable insights based on:
- Current market data and stock prices
- Company fundamentals (sector, industry, market cap)
- Recent news and market sentiment
- Historical performance trends
- Portfolio composition and diversification

Format your response as follows:
1. Executive Summary (2-3 sentences highlighting key findings)
2. Portfolio Overview & Performance (overall metrics, comparison trends)
3. Individual Holdings Analysis (for each stock: performance, outlook, risks)
4. Market Sentiment & News Impact (synthesis of recent news across holdings)
5. Risk Assessment (concentration risk, sector exposure, volatility)
6. Recommendations (specific actions: hold, buy more, sell, rebalance)

After the report, on a new line, add: SENTIMENT: [bullish|bearish|neutral]

Be specific, data-driven, and comprehensive. Target 1000-1500 words.
Avoid generic advice - reference specific data points and news.`;

    const userPrompt = `Analyze this portfolio:

Portfolio: ${portfolio.name}
Total Value: $${totalCurrentValue.toFixed(2)}
Total Gain/Loss: $${totalGainLoss.toFixed(2)} (${totalGainLossPercent.toFixed(2)}%)
Holdings: ${validHoldings.length}

Best Performer: ${bestPerformer.ticker} (${bestPerformer.gainLossPercent?.toFixed(2)}%)
Worst Performer: ${worstPerformer.ticker} (${worstPerformer.gainLossPercent?.toFixed(2)}%)

Holdings Data:
${validHoldings
  .map(
    (h) => `
${h.ticker} - ${h.companyInfo?.company_name || "Unknown"}
- Quantity: ${h.quantity} shares
- Purchase Price: $${h.purchasePrice.toFixed(2)}
- Current Price: $${h.currentPrice?.toFixed(2) || "N/A"}
- Gain/Loss: $${h.gainLoss?.toFixed(2) || "N/A"} (${h.gainLossPercent?.toFixed(2) || "N/A"}%)
- Sector: ${h.companyInfo?.sector || "Unknown"}
- Industry: ${h.companyInfo?.industry || "Unknown"}
- Recent News Headlines: ${h.news.slice(0, 3).map((n: NewsArticle) => n.title).join("; ") || "No recent news"}
`
  )
  .join("\n")}

Provide a comprehensive analysis with actionable recommendations.`;

    // Step 5: Generate analysis with selected model
    console.log("Generating analysis with LLM...");
    const selectedModel =
      input.model || AVAILABLE_MODELS.find((m) => m.id.includes("claude"))?.id || AVAILABLE_MODELS[0].id;

    const result = await generateText({
      model: selectedModel,
      system: systemPrompt,
      prompt: userPrompt,
    });

    const fullAnalysis = result.text;

    // Step 6: Extract sentiment
    const sentimentMatch = fullAnalysis.match(
      /SENTIMENT:\s*(bullish|bearish|neutral)/i
    );
    const sentiment = sentimentMatch
      ? sentimentMatch[1].toLowerCase()
      : "neutral";
    const summary = fullAnalysis
      .replace(/SENTIMENT:\s*(bullish|bearish|neutral)/i, "")
      .trim();

    console.log(`Report generated with sentiment: ${sentiment}`);

    // Step 7: Save report
    const report = await prisma.report.create({
      data: {
        portfolioId: portfolio.id,
        status: "completed",
        summary,
        sentiment,
        triggerType: "manual",
        model: selectedModel,
        contextData: JSON.stringify({
          metrics: {
            totalCurrentValue,
            totalGainLoss,
            totalGainLossPercent,
            holdingsCount: validHoldings.length,
          },
          holdings: validHoldings.map((h) => ({
            ticker: h.ticker,
            quantity: h.quantity,
            currentPrice: h.currentPrice,
            gainLoss: h.gainLoss,
            gainLossPercent: h.gainLossPercent,
          })),
          bestPerformer: {
            ticker: bestPerformer.ticker,
            gainLossPercent: bestPerformer.gainLossPercent,
          },
          worstPerformer: {
            ticker: worstPerformer.ticker,
            gainLossPercent: worstPerformer.gainLossPercent,
          },
        }),
      },
    });

    // Step 8: Create output records
    const outputs = await Promise.all(
      input.outputChannels.map((channel) =>
        prisma.reportOutput.create({
          data: {
            reportId: report.id,
            type: channel,
            status: channel === "dashboard" ? "sent" : "pending",
          },
        })
      )
    );

    console.log(`Report ${report.id} created with ${outputs.length} outputs`);

    // Step 9: Cleanup old reports (keep last 10)
    const oldReports = await prisma.report.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { createdAt: "desc" },
      skip: 10,
      select: { id: true },
    });

    if (oldReports.length > 0) {
      await prisma.report.deleteMany({
        where: { id: { in: oldReports.map((r) => r.id) } },
      });
      console.log(`Cleaned up ${oldReports.length} old reports`);
    }

    return {
      report: {
        id: report.id,
        summary,
        sentiment,
        model: selectedModel,
        createdAt: report.createdAt,
      },
      outputs,
    };
  });

// ============================================================================
// INITIATE REPORT - Creates placeholder, fetches data, returns ID for streaming
// ============================================================================

export const initiateReport = authorized
  .route({
    path: "/report/initiate",
    method: "POST",
    summary: "Initiate report generation - returns ID for streaming",
  })
  .input(initiateReportSchema)
  .handler(async ({ context, input }) => {
    // Step 1: Fetch portfolio with holdings
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: context.user.id },
      include: { holdings: true },
    });

    if (!portfolio || portfolio.holdings.length === 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Portfolio not found or has no holdings. Add holdings first.",
      });
    }

    const userId = context.user.email ?? context.user.id;

    // Step 2: Fetch all MCP data in parallel for each holding
    console.log(`Fetching data for ${portfolio.holdings.length} holdings...`);

    const holdingsData = await Promise.all(
      portfolio.holdings.map(async (holding) => {
        try {
          const [priceRes, companyRes, newsRes, histRes] = await Promise.all([
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
            arcadeClient.tools.execute({
              tool_name: "FinancialMcp.GetCompanyNews@1.0.0",
              input: { ticker: holding.ticker, max_articles: 5 },
              user_id: userId,
            }),
            arcadeClient.tools.execute({
              tool_name: "FinancialMcp.GetHistoricalPrices@1.0.0",
              input: { ticker: holding.ticker, period: "3mo" },
              user_id: userId,
            }),
          ]);

          const priceData =
            typeof priceRes.output?.value === "string"
              ? JSON.parse(priceRes.output.value)
              : priceRes.output?.value;

          const companyData =
            typeof companyRes.output?.value === "string"
              ? JSON.parse(companyRes.output.value)
              : companyRes.output?.value;

          const newsData =
            typeof newsRes.output?.value === "string"
              ? JSON.parse(newsRes.output.value)
              : newsRes.output?.value;

          const historicalData =
            typeof histRes.output?.value === "string"
              ? JSON.parse(histRes.output.value)
              : histRes.output?.value;

          const currentPrice = priceData?.price ?? null;
          const purchaseValue = holding.purchasePrice * holding.quantity;
          const currentValue = currentPrice
            ? currentPrice * holding.quantity
            : null;
          const gainLoss = currentValue ? currentValue - purchaseValue : null;
          const gainLossPercent = gainLoss
            ? (gainLoss / purchaseValue) * 100
            : null;

          return {
            ticker: holding.ticker,
            quantity: holding.quantity,
            purchasePrice: holding.purchasePrice,
            purchaseDate: holding.purchaseDate,
            currentPrice,
            currentValue,
            gainLoss,
            gainLossPercent,
            companyInfo: companyData,
            news: newsData?.articles || [],
            historicalPrices: historicalData?.prices || [],
          };
        } catch (error) {
          console.error(`Failed to fetch data for ${holding.ticker}:`, error);
          return null;
        }
      })
    );

    const validHoldings = holdingsData.filter((h) => h !== null);

    if (validHoldings.length === 0) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          "Failed to fetch data for any holdings. Please try again later.",
      });
    }

    // Step 3: Calculate portfolio-level metrics
    const totalPurchaseValue = validHoldings.reduce(
      (sum, h) => sum + h.purchasePrice * h.quantity,
      0
    );
    const totalCurrentValue = validHoldings.reduce(
      (sum, h) => sum + (h.currentValue || 0),
      0
    );
    const totalGainLoss = totalCurrentValue - totalPurchaseValue;
    const totalGainLossPercent = totalPurchaseValue > 0
      ? (totalGainLoss / totalPurchaseValue) * 100
      : 0;

    const sortedByPerformance = [...validHoldings].sort(
      (a, b) => (b.gainLossPercent || 0) - (a.gainLossPercent || 0)
    );
    const bestPerformer = sortedByPerformance[0];
    const worstPerformer = sortedByPerformance[sortedByPerformance.length - 1];

    const selectedModel =
      input.model ||
      AVAILABLE_MODELS.find((m) => m.id.includes("claude"))?.id ||
      AVAILABLE_MODELS[0].id;

    // Step 4: Create report with "generating" status
    const report = await prisma.report.create({
      data: {
        portfolioId: portfolio.id,
        status: "generating",
        summary: "",
        triggerType: "manual",
        model: selectedModel,
        contextData: JSON.stringify({
          portfolioName: portfolio.name,
          metrics: {
            totalCurrentValue,
            totalGainLoss,
            totalGainLossPercent,
            holdingsCount: validHoldings.length,
          },
          holdings: validHoldings.map((h) => ({
            ticker: h.ticker,
            quantity: h.quantity,
            purchasePrice: h.purchasePrice,
            currentPrice: h.currentPrice,
            currentValue: h.currentValue,
            gainLoss: h.gainLoss,
            gainLossPercent: h.gainLossPercent,
            companyInfo: h.companyInfo,
            news: h.news,
          })),
          bestPerformer: {
            ticker: bestPerformer.ticker,
            gainLossPercent: bestPerformer.gainLossPercent,
          },
          worstPerformer: {
            ticker: worstPerformer.ticker,
            gainLossPercent: worstPerformer.gainLossPercent,
          },
        }),
      },
    });

    // Step 5: Create output records
    await Promise.all(
      input.outputChannels.map((channel) =>
        prisma.reportOutput.create({
          data: {
            reportId: report.id,
            type: channel,
            status: "pending",
          },
        })
      )
    );

    console.log(`Report ${report.id} initiated for streaming`);

    return { reportId: report.id };
  });

// ============================================================================
// STREAM REPORT - Streams AI content for a generating report
// ============================================================================

export const streamReport = authorized
  .route({
    path: "/report/stream",
    method: "POST",
    summary: "Stream AI-generated report content",
  })
  .input(streamReportSchema)
  .handler(async ({ context, input }) => {
    const report = await prisma.report.findFirst({
      where: { id: input.reportId },
      include: { portfolio: true },
    });

    if (!report || report.portfolio.userId !== context.user.id) {
      throw new ORPCError("NOT_FOUND", { message: "Report not found" });
    }

    if (report.status !== "generating") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Report is not in generating state",
      });
    }

    const contextData = JSON.parse(report.contextData || "{}");
    const {
      portfolioName,
      metrics,
      holdings,
      bestPerformer,
      worstPerformer,
    } = contextData;

    // Build prompts
    const systemPrompt = `You are a financial analyst generating a comprehensive portfolio analysis report.

Your goal is to provide actionable insights based on:
- Current market data and stock prices
- Company fundamentals (sector, industry, market cap)
- Recent news and market sentiment
- Historical performance trends
- Portfolio composition and diversification

Format your response in markdown with the following sections:
## Executive Summary
2-3 sentences highlighting key findings

## Portfolio Overview & Performance
Overall metrics and comparison trends

## Individual Holdings Analysis
For each stock: performance, outlook, risks

## Market Sentiment & News Impact
Synthesis of recent news across holdings

## Risk Assessment
Concentration risk, sector exposure, volatility

## Recommendations
Specific actions: hold, buy more, sell, rebalance

Be specific, data-driven, and comprehensive. Target 1000-1500 words.
Avoid generic advice - reference specific data points and news.`;

    const userPrompt = `Analyze this portfolio:

Portfolio: ${portfolioName}
Total Value: $${metrics.totalCurrentValue.toFixed(2)}
Total Gain/Loss: $${metrics.totalGainLoss.toFixed(2)} (${metrics.totalGainLossPercent.toFixed(2)}%)
Holdings: ${metrics.holdingsCount}

Best Performer: ${bestPerformer.ticker} (${bestPerformer.gainLossPercent?.toFixed(2)}%)
Worst Performer: ${worstPerformer.ticker} (${worstPerformer.gainLossPercent?.toFixed(2)}%)

Holdings Data:
${holdings
  .map(
    (h: {
      ticker: string;
      quantity: number;
      purchasePrice: number;
      currentPrice: number | null;
      gainLoss: number | null;
      gainLossPercent: number | null;
      companyInfo?: { company_name?: string; sector?: string; industry?: string };
      news?: NewsArticle[];
    }) => `
${h.ticker} - ${h.companyInfo?.company_name || "Unknown"}
- Quantity: ${h.quantity} shares
- Purchase Price: $${h.purchasePrice.toFixed(2)}
- Current Price: $${h.currentPrice?.toFixed(2) || "N/A"}
- Gain/Loss: $${h.gainLoss?.toFixed(2) || "N/A"} (${h.gainLossPercent?.toFixed(2) || "N/A"}%)
- Sector: ${h.companyInfo?.sector || "Unknown"}
- Industry: ${h.companyInfo?.industry || "Unknown"}
- Recent News: ${h.news?.slice(0, 3).map((n: NewsArticle) => n.title).join("; ") || "No recent news"}
`
  )
  .join("\n")}

Provide a comprehensive analysis with actionable recommendations.`;

    console.log(`Streaming report ${report.id}...`);

    const result = streamText({
      model: report.model,
      system: systemPrompt,
      prompt: userPrompt,
      async onFinish({ text }) {
        // Extract sentiment from the generated text
        const sentimentMatch = text.match(
          /SENTIMENT:\s*(bullish|bearish|neutral)/i
        );
        const sentiment = sentimentMatch
          ? sentimentMatch[1].toLowerCase()
          : "neutral";
        const summary = text
          .replace(/SENTIMENT:\s*(bullish|bearish|neutral)/i, "")
          .trim();

        // Update report with final content
        await prisma.report.update({
          where: { id: report.id },
          data: {
            status: "completed",
            summary,
            sentiment,
          },
        });

        // Update dashboard output to sent
        await prisma.reportOutput.updateMany({
          where: { reportId: report.id, type: "dashboard" },
          data: { status: "sent" },
        });

        // Cleanup old reports (keep last 10)
        const oldReports = await prisma.report.findMany({
          where: { portfolioId: report.portfolioId },
          orderBy: { createdAt: "desc" },
          skip: 10,
          select: { id: true },
        });

        if (oldReports.length > 0) {
          await prisma.report.deleteMany({
            where: { id: { in: oldReports.map((r) => r.id) } },
          });
          console.log(`Cleaned up ${oldReports.length} old reports`);
        }

        console.log(`Report ${report.id} completed with sentiment: ${sentiment}`);
      },
    });

    return streamToEventIterator(result.toUIMessageStream());
  });

// ============================================================================
// LIST REPORTS
// ============================================================================

export const listReports = authorized
  .route({
    path: "/report/list",
    method: "GET",
    summary: "List user's reports (last 10)",
  })
  .handler(async ({ context }) => {
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: context.user.id },
    });

    if (!portfolio) {
      return { reports: [] };
    }

    const reports = await prisma.report.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        outputs: true,
      },
    });

    return { reports };
  });

// ============================================================================
// GET REPORT
// ============================================================================

export const getReport = authorized
  .route({
    path: "/report/get",
    method: "GET",
    summary: "Get report details",
  })
  .input(getReportSchema)
  .handler(async ({ context, input }) => {
    const report = await prisma.report.findFirst({
      where: { id: input.reportId },
      include: {
        portfolio: true,
        outputs: true,
      },
    });

    if (!report || report.portfolio.userId !== context.user.id) {
      throw new ORPCError("NOT_FOUND", { message: "Report not found" });
    }

    return { report };
  });

// ============================================================================
// DELETE REPORT
// ============================================================================

export const deleteReport = authorized
  .route({
    path: "/report/delete",
    method: "POST",
    summary: "Delete report",
  })
  .input(deleteReportSchema)
  .handler(async ({ context, input }) => {
    const report = await prisma.report.findFirst({
      where: { id: input.reportId },
      include: { portfolio: true },
    });

    if (!report || report.portfolio.userId !== context.user.id) {
      throw new ORPCError("NOT_FOUND", { message: "Report not found" });
    }

    await prisma.report.delete({ where: { id: input.reportId } });

    return { success: true };
  });

// ============================================================================
// PUBLISH TO CHANNEL (Notion/Google Docs via Arcade OAuth)
// ============================================================================

export const publishToChannel = authorized
  .route({
    path: "/report/publish",
    method: "POST",
    summary: "Publish report to external channel (Notion/Docs)",
  })
  .input(publishReportSchema)
  .handler(async ({ context, input }) => {
    const report = await prisma.report.findFirst({
      where: { id: input.reportId },
      include: { portfolio: true },
    });

    if (!report || report.portfolio.userId !== context.user.id) {
      throw new ORPCError("NOT_FOUND", { message: "Report not found" });
    }

    if (report.status !== "completed") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cannot publish a report that is still generating",
      });
    }

    const userId = context.user.email ?? context.user.id;
    const toolName =
      input.channel === "notion"
        ? "Notion.CreatePage"
        : "GoogleDocs.CreateDocumentFromText";

    // Check authorization (Arcade OAuth flow)
    const authResponse = await arcadeClient.tools.authorize({
      tool_name: toolName,
      user_id: userId,
    });

    if (authResponse.status !== "completed") {
      if (!input.waitForAuth) {
        return {
          status: "authorization_required",
          authUrl: authResponse.url,
          authId: authResponse.id,
        };
      }
      await arcadeClient.auth.waitForCompletion(authResponse);
    }

    // Execute tool
    console.log(`Publishing report ${report.id} to ${input.channel}...`);

    let response;
    const reportTitle = `Portfolio Report - ${new Date(report.createdAt).toLocaleDateString()}`;

    if (input.channel === "docs") {
      response = await arcadeClient.tools.execute({
        tool_name: toolName,
        input: {
          title: reportTitle,
          text_content: report.summary,
        },
        user_id: userId,
      });
    } else {
      // Notion
      response = await arcadeClient.tools.execute({
        tool_name: toolName,
        input: {
          title: reportTitle,
          content: report.summary,
        },
        user_id: userId,
      });
    }

    const outputData = response.output?.value as ArcadeOutputValue | undefined;
    const url = outputData?.url ?? outputData?.document_url ?? null;

    // Update or create output record
    const output = await prisma.reportOutput.upsert({
      where: {
        reportId_type: {
          reportId: report.id,
          type: input.channel,
        },
      },
      update: {
        status: "sent",
        url,
      },
      create: {
        reportId: report.id,
        type: input.channel,
        status: "sent",
        url,
      },
    });

    console.log(`Report published to ${input.channel}: ${url}`);

    return {
      status: "completed",
      output,
    };
  });
