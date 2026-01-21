import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import Arcade from "@arcadeai/arcadejs";

// Hobby: max 60s, Pro: max 300s
export const maxDuration = 60;

import prisma from "@/lib/db";
import { env } from "@/lib/env";
import { AVAILABLE_MODELS } from "@/lib/ai-models";

const arcadeClient = new Arcade({ apiKey: env.ARCADE_API_KEY });

// Type definitions
interface NewsArticle {
  title: string;
  publisher: string;
  link: string;
  publish_time: string;
}

interface HoldingData {
  ticker: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: Date;
  currentPrice: number | null;
  currentValue: number | null;
  gainLoss: number | null;
  gainLossPercent: number | null;
  companyInfo: Record<string, unknown>;
  news: NewsArticle[];
  historicalPrices: unknown[];
}

// Get default model (Claude)
const DEFAULT_MODEL =
  AVAILABLE_MODELS.find((m) => m.id.includes("claude"))?.id ||
  AVAILABLE_MODELS[0].id;

// Default output channels for scheduled reports
const DEFAULT_OUTPUT_CHANNELS = ["dashboard", "email"];

/**
 * Fetch MCP data for all holdings in a portfolio
 */
async function fetchHoldingsData(
  holdings: Array<{
    ticker: string;
    quantity: number;
    purchasePrice: number;
    purchaseDate: Date;
  }>,
  userId: string
): Promise<HoldingData[]> {
  const holdingsData = await Promise.all(
    holdings.map(async (holding) => {
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
          companyInfo: companyData || {},
          news: newsData?.articles || [],
          historicalPrices: historicalData?.prices || [],
        };
      } catch (error) {
        console.error(
          `[Cron] Failed to fetch data for ${holding.ticker}:`,
          error
        );
        return null;
      }
    })
  );

  return holdingsData.filter((h): h is HoldingData => h !== null);
}

/**
 * Generate report for a single portfolio
 */
async function generatePortfolioReport(
  portfolio: {
    id: string;
    name: string;
    holdings: Array<{
      ticker: string;
      quantity: number;
      purchasePrice: number;
      purchaseDate: Date;
    }>;
  },
  userEmail: string
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    console.log(`[Cron] Generating report for portfolio: ${portfolio.name}`);

    // Fetch holdings data
    const validHoldings = await fetchHoldingsData(portfolio.holdings, userEmail);

    if (validHoldings.length === 0) {
      return {
        success: false,
        error: "Failed to fetch data for any holdings",
      };
    }

    // Calculate portfolio-level metrics
    const totalPurchaseValue = validHoldings.reduce(
      (sum, h) => sum + h.purchasePrice * h.quantity,
      0
    );
    const totalCurrentValue = validHoldings.reduce(
      (sum, h) => sum + (h.currentValue || 0),
      0
    );
    const totalGainLoss = totalCurrentValue - totalPurchaseValue;
    const totalGainLossPercent =
      totalPurchaseValue > 0 ? (totalGainLoss / totalPurchaseValue) * 100 : 0;

    // Find best and worst performers
    const sortedByPerformance = [...validHoldings].sort(
      (a, b) => (b.gainLossPercent || 0) - (a.gainLossPercent || 0)
    );
    const bestPerformer = sortedByPerformance[0];
    const worstPerformer = sortedByPerformance[sortedByPerformance.length - 1];

    // Build prompts
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
${h.ticker} - ${(h.companyInfo as { company_name?: string })?.company_name || "Unknown"}
- Quantity: ${h.quantity} shares
- Purchase Price: $${h.purchasePrice.toFixed(2)}
- Current Price: $${h.currentPrice?.toFixed(2) || "N/A"}
- Gain/Loss: $${h.gainLoss?.toFixed(2) || "N/A"} (${h.gainLossPercent?.toFixed(2) || "N/A"}%)
- Sector: ${(h.companyInfo as { sector?: string })?.sector || "Unknown"}
- Industry: ${(h.companyInfo as { industry?: string })?.industry || "Unknown"}
- Recent News Headlines: ${h.news.slice(0, 3).map((n) => n.title).join("; ") || "No recent news"}
`
  )
  .join("\n")}

Provide a comprehensive analysis with actionable recommendations.`;

    // Generate analysis with LLM
    console.log(`[Cron] Generating AI analysis for ${portfolio.name}...`);
    const result = await generateText({
      model: DEFAULT_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
    });

    const fullAnalysis = result.text;

    // Extract sentiment
    const sentimentMatch = fullAnalysis.match(
      /SENTIMENT:\s*(bullish|bearish|neutral)/i
    );
    const sentiment = sentimentMatch
      ? sentimentMatch[1].toLowerCase()
      : "neutral";
    const summary = fullAnalysis
      .replace(/SENTIMENT:\s*(bullish|bearish|neutral)/i, "")
      .trim();

    // Save report
    const report = await prisma.report.create({
      data: {
        portfolioId: portfolio.id,
        status: "completed",
        summary,
        sentiment,
        triggerType: "scheduled",
        model: DEFAULT_MODEL,
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

    // Create output records
    await Promise.all(
      DEFAULT_OUTPUT_CHANNELS.map((channel) =>
        prisma.reportOutput.create({
          data: {
            reportId: report.id,
            type: channel,
            status: channel === "dashboard" ? "sent" : "pending",
          },
        })
      )
    );

    // Send email via Gmail.SendEmail
    try {
      console.log(`[Cron] Sending email report to ${userEmail}...`);

      const reportTitle = `Weekly Portfolio Report - ${new Date(report.createdAt).toLocaleDateString()}`;
      const htmlBody = `
        <h1>${reportTitle}</h1>
        <p><strong>Portfolio:</strong> ${portfolio.name}</p>
        <p><strong>Sentiment:</strong> ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}</p>
        <hr>
        <div style="font-family: sans-serif; line-height: 1.6;">
          ${summary.replace(/\n/g, "<br>")}
        </div>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated weekly report from your Financial Portfolio Agent.
        </p>
      `;

      await arcadeClient.tools.execute({
        tool_name: "Gmail.SendEmail",
        input: {
          subject: reportTitle,
          body: htmlBody,
          recipient: userEmail,
          content_type: "html",
        },
        user_id: userEmail,
      });

      // Update email output record to sent
      await prisma.reportOutput.updateMany({
        where: { reportId: report.id, type: "email" },
        data: { status: "sent" },
      });

      console.log(`[Cron] Email sent successfully to ${userEmail}`);
    } catch (emailError) {
      console.error(`[Cron] Failed to send email to ${userEmail}:`, emailError);
      // Update email output record to failed
      await prisma.reportOutput.updateMany({
        where: { reportId: report.id, type: "email" },
        data: { status: "failed" },
      });
    }

    // Cleanup old reports (keep last 10)
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
      console.log(
        `[Cron] Cleaned up ${oldReports.length} old reports for ${portfolio.name}`
      );
    }

    console.log(
      `[Cron] Report ${report.id} created for ${portfolio.name} with sentiment: ${sentiment}`
    );

    return { success: true, reportId: report.id };
  } catch (error) {
    console.error(
      `[Cron] Error generating report for ${portfolio.name}:`,
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Vercel Cron Job: Generate weekly reports for all portfolios
 * Schedule: Every Monday at 9 AM UTC (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    console.error("[Cron] Unauthorized request - invalid CRON_SECRET");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron] Starting weekly report generation...");

  try {
    // Fetch all portfolios with holdings
    const portfolios = await prisma.portfolio.findMany({
      where: {
        holdings: {
          some: {}, // Only portfolios with at least one holding
        },
      },
      include: {
        holdings: true,
        user: {
          select: { email: true },
        },
      },
    });

    console.log(`[Cron] Found ${portfolios.length} portfolios with holdings`);

    if (portfolios.length === 0) {
      return NextResponse.json({
        message: "No portfolios with holdings found",
        generated: 0,
        failed: 0,
        duration: Date.now() - startTime,
      });
    }

    // Process each portfolio
    const results: Array<{
      portfolioId: string;
      portfolioName: string;
      success: boolean;
      reportId?: string;
      error?: string;
    }> = [];

    for (const portfolio of portfolios) {
      const result = await generatePortfolioReport(
        {
          id: portfolio.id,
          name: portfolio.name,
          holdings: portfolio.holdings,
        },
        portfolio.user.email
      );

      results.push({
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        ...result,
      });
    }

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(
      `[Cron] Weekly report generation complete: ${successful.length} succeeded, ${failed.length} failed`
    );

    return NextResponse.json({
      message: "Weekly report generation complete",
      generated: successful.length,
      failed: failed.length,
      duration: Date.now() - startTime,
      results,
    });
  } catch (error) {
    console.error("[Cron] Fatal error in weekly report generation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
