import { NextRequest, NextResponse } from "next/server";
import { generateText, stepCountIs, type ToolSet } from "ai";
import { Arcade } from "@arcadeai/arcadejs";
import {
  toZodToolSet,
  executeOrAuthorizeZodTool,
} from "@arcadeai/arcadejs/lib";

// Hobby: max 60s, Pro: max 300s
export const maxDuration = 60;

import prisma from "@/lib/db";
import { env } from "@/lib/env";
import { AVAILABLE_MODELS } from "@/lib/ai-models";

const arcadeClient = new Arcade({ apiKey: env.ARCADE_API_KEY });

// Get default model (Claude)
const DEFAULT_MODEL =
  AVAILABLE_MODELS.find((m) => m.id.includes("claude"))?.id ||
  AVAILABLE_MODELS[0].id;

// Default output channels for scheduled reports
const DEFAULT_OUTPUT_CHANNELS = ["dashboard", "email"];

// Configuration for which Arcade tools to use in reports
const arcadeToolsConfig = {
  mcpServers: ["FinancialMcp"],
  toolLimit: 30,
};

// Strip null and undefined values from tool inputs
function stripNullValues(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// Adapter to convert Arcade tools to Vercel AI SDK format
function toVercelTools(arcadeTools: Record<string, unknown>): ToolSet {
  const vercelTools: Record<string, unknown> = {};

  for (const [name, tool] of Object.entries(arcadeTools)) {
    const t = tool as {
      description: string;
      parameters: unknown;
      execute: (input: Record<string, unknown>) => Promise<unknown>;
    };
    vercelTools[name] = {
      description: t.description,
      inputSchema: t.parameters,
      execute: async (input: Record<string, unknown>) => {
        const cleanedInput = stripNullValues(input);
        return t.execute(cleanedInput);
      },
    };
  }

  return vercelTools as ToolSet;
}

// Fetch and convert Arcade tools dynamically for report generation
async function getArcadeTools(userId: string) {
  const mcpServerTools = await Promise.all(
    arcadeToolsConfig.mcpServers.map(async (serverName) => {
      const response = await arcadeClient.tools.list({
        toolkit: serverName,
        limit: arcadeToolsConfig.toolLimit,
      });
      return response.items;
    })
  );

  const allTools = mcpServerTools.flat();
  const uniqueTools = Array.from(
    new Map(allTools.map((tool) => [tool.qualified_name, tool])).values()
  );

  const arcadeTools = toZodToolSet({
    tools: uniqueTools,
    client: arcadeClient,
    userId,
    executeFactory: executeOrAuthorizeZodTool,
  });

  return toVercelTools(arcadeTools);
}

/**
 * Generate report for a single portfolio using agentic AI
 * The LLM autonomously decides what data to research based on findings
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
    console.log(
      `[Cron] Starting agentic report generation for portfolio: ${portfolio.name}`
    );

    // Calculate total purchase value for context
    const totalPurchaseValue = portfolio.holdings.reduce(
      (sum, h) => sum + h.purchasePrice * h.quantity,
      0
    );

    // Fetch Arcade tools dynamically - LLM will decide what to call
    const tools = await getArcadeTools(userEmail);

    // Agentic system prompt - tells the LLM to research autonomously
    const systemPrompt = `You are an autonomous financial analyst agent generating a weekly portfolio report.

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

IMPORTANT: When calling tools, if an argument is optional, do not set it. Never pass null for optional parameters.

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
Target 1000-1500 words for the final report.

At the very end, on a new line, add: SENTIMENT: [bullish|bearish|neutral]`;

    // User prompt with just the holdings - agent will research the rest
    const holdingsList = portfolio.holdings
      .map(
        (h) =>
          `- ${h.ticker}: ${h.quantity} shares purchased at $${h.purchasePrice.toFixed(2)}${h.purchaseDate ? ` on ${new Date(h.purchaseDate).toLocaleDateString()}` : ""}`
      )
      .join("\n");

    const userPrompt = `Analyze this portfolio and generate a comprehensive weekly report.

Portfolio: ${portfolio.name}
Total Purchase Value: $${totalPurchaseValue.toFixed(2)}
Number of Holdings: ${portfolio.holdings.length}

Holdings:
${holdingsList}

Use your tools to research each holding and generate insights. Start by getting current prices, then dig deeper into positions that need attention.`;

    // Generate analysis with agentic LLM - allows up to 15 tool calls
    console.log(`[Cron] Starting agentic AI research for ${portfolio.name}...`);
    const result = await generateText({
      model: DEFAULT_MODEL,
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      toolChoice: "auto",
      stopWhen: stepCountIs(15), // Allow up to 15 tool calls for thorough research
    });

    console.log(
      `[Cron] Agent completed research with ${result.steps.length} steps for ${portfolio.name}`
    );

    const fullAnalysis = result.text;

    // Extract sentiment from the report
    const sentimentMatch = fullAnalysis.match(
      /SENTIMENT:\s*(bullish|bearish|neutral)/i
    );
    let sentiment = "neutral";
    if (sentimentMatch) {
      sentiment = sentimentMatch[1].toLowerCase();
    } else {
      // Fallback: analyze content for sentiment signals
      const lowerText = fullAnalysis.toLowerCase();
      const bullishSignals = (
        lowerText.match(
          /bullish|strong|growth|outperform|buy|upside|positive/g
        ) || []
      ).length;
      const bearishSignals = (
        lowerText.match(
          /bearish|weak|decline|underperform|sell|downside|negative|risk|concern/g
        ) || []
      ).length;
      if (bullishSignals > bearishSignals + 2) sentiment = "bullish";
      else if (bearishSignals > bullishSignals + 2) sentiment = "bearish";
    }

    const summary = fullAnalysis
      .replace(/SENTIMENT:\s*(bullish|bearish|neutral)/i, "")
      .trim();

    // Save report with context about what was researched
    const report = await prisma.report.create({
      data: {
        portfolioId: portfolio.id,
        status: "completed",
        summary,
        sentiment,
        triggerType: "scheduled",
        model: DEFAULT_MODEL,
        contextData: JSON.stringify({
          portfolioName: portfolio.name,
          totalPurchaseValue,
          holdingsCount: portfolio.holdings.length,
          holdings: portfolio.holdings.map((h) => ({
            ticker: h.ticker,
            quantity: h.quantity,
            purchasePrice: h.purchasePrice,
            purchaseDate: h.purchaseDate,
          })),
          agentSteps: result.steps.length,
          generatedAt: new Date().toISOString(),
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
