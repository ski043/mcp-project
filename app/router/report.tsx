import { ORPCError, streamToEventIterator } from "@orpc/server";
import { generateText, streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
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
// AGENTIC TOOLS - LLM decides what to research
// ============================================================================

const createReportTools = (userId: string) => ({
  get_stock_price: tool({
    description: "Get current stock price, volume, and daily change for a ticker. Use this to check current valuations.",
    inputSchema: z.object({
      ticker: z.string().describe("Stock ticker symbol (e.g., AAPL, MSFT)"),
    }),
    execute: async ({ ticker }) => {
      const response = await arcadeClient.tools.execute({
        tool_name: "FinancialMcp.GetStockPrice@1.0.0",
        input: { ticker },
        user_id: userId,
      });
      return typeof response.output?.value === "string"
        ? JSON.parse(response.output.value)
        : response.output?.value;
    },
  }),

  get_company_info: tool({
    description: "Get company fundamentals including sector, industry, market cap, and P/E ratio. Useful for understanding what the company does and its size.",
    inputSchema: z.object({
      ticker: z.string().describe("Stock ticker symbol"),
    }),
    execute: async ({ ticker }) => {
      const response = await arcadeClient.tools.execute({
        tool_name: "FinancialMcp.GetCompanyInfo@1.0.0",
        input: { ticker },
        user_id: userId,
      });
      return typeof response.output?.value === "string"
        ? JSON.parse(response.output.value)
        : response.output?.value;
    },
  }),

  get_company_news: tool({
    description: "Get recent news articles about a company. Use this to understand market sentiment and recent events that might affect the stock.",
    inputSchema: z.object({
      ticker: z.string().describe("Stock ticker symbol"),
      max_articles: z.number().default(5).describe("Maximum number of articles (1-10)"),
    }),
    execute: async ({ ticker, max_articles }) => {
      const response = await arcadeClient.tools.execute({
        tool_name: "FinancialMcp.GetCompanyNews@1.0.0",
        input: { ticker, max_articles },
        user_id: userId,
      });
      return typeof response.output?.value === "string"
        ? JSON.parse(response.output.value)
        : response.output?.value;
    },
  }),

  get_historical_prices: tool({
    description: "Get historical price data to analyze trends. Use this to understand price movements over time.",
    inputSchema: z.object({
      ticker: z.string().describe("Stock ticker symbol"),
      period: z.enum(["1mo", "3mo", "6mo", "1y", "2y"]).default("3mo"),
    }),
    execute: async ({ ticker, period }) => {
      const response = await arcadeClient.tools.execute({
        tool_name: "FinancialMcp.GetHistoricalPrices@1.0.0",
        input: { ticker, period },
        user_id: userId,
      });
      return typeof response.output?.value === "string"
        ? JSON.parse(response.output.value)
        : response.output?.value;
    },
  }),
});

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
// INITIATE REPORT - Creates placeholder with holdings, returns ID for agentic streaming
// ============================================================================

export const initiateReport = authorized
  .route({
    path: "/report/initiate",
    method: "POST",
    summary: "Initiate report generation - returns ID for agentic streaming",
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

    const selectedModel =
      input.model ||
      AVAILABLE_MODELS.find((m) => m.id.includes("claude"))?.id ||
      AVAILABLE_MODELS[0].id;

    // Step 2: Calculate total purchase value for context
    const totalPurchaseValue = portfolio.holdings.reduce(
      (sum, h) => sum + h.purchasePrice * h.quantity,
      0
    );

    // Step 3: Create report with "generating" status
    // Only store basic holdings info - the agent will research the rest
    const report = await prisma.report.create({
      data: {
        portfolioId: portfolio.id,
        status: "generating",
        summary: "",
        triggerType: "manual",
        model: selectedModel,
        contextData: JSON.stringify({
          portfolioName: portfolio.name,
          totalPurchaseValue,
          holdings: portfolio.holdings.map((h) => ({
            ticker: h.ticker,
            quantity: h.quantity,
            purchasePrice: h.purchasePrice,
            purchaseDate: h.purchaseDate,
          })),
        }),
      },
    });

    // Step 4: Create output records
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

    console.log(`Report ${report.id} initiated for agentic streaming`);

    return { reportId: report.id };
  });

// ============================================================================
// STREAM REPORT - Agentic AI that autonomously researches and generates report
// ============================================================================

export const streamReport = authorized
  .route({
    path: "/report/stream",
    method: "POST",
    summary: "Stream agentic AI-generated report with autonomous tool calling",
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
    const { portfolioName, totalPurchaseValue, holdings } = contextData;

    // Get user ID for Arcade tools
    const userId = context.user.email ?? context.user.id;

    // Create tools for the agent
    const tools = createReportTools(userId);

    // Agentic system prompt - tells the LLM to research autonomously
    const systemPrompt = `You are an autonomous financial analyst agent. Your task is to analyze a portfolio and generate a comprehensive report.

You have access to tools to research each holding. You should:
1. First, get current prices for all holdings to calculate performance
2. Identify holdings that need deeper analysis (significant gains/losses, high volatility)
3. Research company fundamentals for context
4. Check news for any holdings with notable price movements
5. Look at historical trends for concerning positions

IMPORTANT: Be intelligent about your research:
- If a stock is down significantly, investigate WHY (check news, fundamentals)
- If a stock is up significantly, check if the gains are sustainable
- Don't waste time deeply researching stable, boring positions
- Focus your attention where it matters most

After gathering data, write your report in markdown with these sections:
## Executive Summary
2-3 sentences with key findings and overall portfolio health

## Portfolio Performance
Total value, overall gain/loss, comparison to purchase value

## Holdings Analysis
For each holding: current performance, key insights, outlook
Spend more words on holdings that warrant attention

## Market Context & News
Synthesize relevant news that affects the portfolio

## Risk Assessment
Concentration risk, sector exposure, any red flags

## Recommendations
Specific, actionable advice based on your research

Be data-driven and specific. Reference actual numbers and news headlines.
Target 1000-1500 words for the final report.`;

    // User prompt with just the holdings - agent will research the rest
    const holdingsList = holdings
      .map((h: { ticker: string; quantity: number; purchasePrice: number; purchaseDate: string }) =>
        `- ${h.ticker}: ${h.quantity} shares purchased at $${h.purchasePrice.toFixed(2)}${h.purchaseDate ? ` on ${new Date(h.purchaseDate).toLocaleDateString()}` : ""}`
      )
      .join("\n");

    const userPrompt = `Analyze this portfolio and generate a comprehensive report.

Portfolio: ${portfolioName}
Total Purchase Value: $${totalPurchaseValue.toFixed(2)}
Number of Holdings: ${holdings.length}

Holdings:
${holdingsList}

Use your tools to research each holding and generate insights. Start by getting current prices, then dig deeper into positions that need attention.`;

    console.log(`Starting agentic report generation for ${report.id}...`);

    const result = streamText({
      model: report.model,
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      toolChoice: "auto",
      stopWhen: stepCountIs(15), // Allow up to 15 tool calls for thorough research
      async onFinish({ text }) {
        // Determine sentiment based on content analysis
        let sentiment = "neutral";
        const lowerText = text.toLowerCase();
        const bullishSignals = (lowerText.match(/bullish|strong|growth|outperform|buy|upside|positive/g) || []).length;
        const bearishSignals = (lowerText.match(/bearish|weak|decline|underperform|sell|downside|negative|risk|concern/g) || []).length;

        if (bullishSignals > bearishSignals + 2) sentiment = "bullish";
        else if (bearishSignals > bullishSignals + 2) sentiment = "bearish";

        // Update report with final content
        await prisma.report.update({
          where: { id: report.id },
          data: {
            status: "completed",
            summary: text.trim(),
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

        console.log(`Agentic report ${report.id} completed with sentiment: ${sentiment}`);
      },
    });

    return streamToEventIterator(result.toUIMessageStream({ sendReasoning: true }));
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
// PUBLISH TO CHANNEL (Email/Notion/Google Docs via Arcade OAuth)
// ============================================================================

export const publishToChannel = authorized
  .route({
    path: "/report/publish",
    method: "POST",
    summary: "Publish report to external channel (Email/Notion/Docs)",
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
    const userEmail = context.user.email;

    // Determine tool name based on channel
    const toolNameMap: Record<string, string> = {
      email: "Gmail.SendEmail",
      notion: "Notion.CreatePage",
      docs: "GoogleDocs.CreateDocumentFromText",
    };
    const toolName = toolNameMap[input.channel];

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

    if (input.channel === "email") {
      if (!userEmail) {
        throw new ORPCError("BAD_REQUEST", {
          message: "User email not found. Cannot send email report.",
        });
      }

      // Format report as HTML email
      const htmlBody = `
        <h1>${reportTitle}</h1>
        <div style="font-family: sans-serif; line-height: 1.6;">
          ${report.summary.replace(/\n/g, "<br>")}
        </div>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Generated by Financial Portfolio Agent
        </p>
      `;

      response = await arcadeClient.tools.execute({
        tool_name: toolName,
        input: {
          subject: reportTitle,
          body: htmlBody,
          recipient: userEmail,
          content_type: "html",
        },
        user_id: userId,
      });
    } else if (input.channel === "docs") {
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

    console.log(`Report published to ${input.channel}: ${url ?? "sent"}`);

    return {
      status: "completed",
      output,
    };
  });
