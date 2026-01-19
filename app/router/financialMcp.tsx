import Arcade from "@arcadeai/arcadejs";
import { z } from "zod";

import { env } from "@/lib/env";
import { authorized } from "../middlewares/auth";

const arcadeClient = new Arcade({ apiKey: env.ARCADE_API_KEY });

// Financial MCP Gateway Tests
type StockPriceResponse = {
  tool: string;
  ticker: string;
  data: unknown;
};

export const testGetStockPrice = authorized
  .route({
    path: "/financial-mcp/stock-price",
    method: "POST",
    summary: "Test financial MCP: get stock price",
  })
  .input(
    z.object({
      ticker: z.string().min(1).default("AAPL"),
    })
  )
  .handler(async ({ context, input }) => {
    const userId = context.user.email ?? context.user.id;

    const response = await arcadeClient.tools.execute({
      tool_name: "FinancialMcp.GetStockPrice@1.0.0",
      input: { ticker: input.ticker },
      user_id: userId,
    });

    const payload: StockPriceResponse = {
      tool: "get_stock_price",
      ticker: input.ticker,
      data: response.output?.value ?? null,
    };

    return payload;
  });

type CompanyInfoResponse = {
  tool: string;
  ticker: string;
  data: unknown;
};

export const testGetCompanyInfo = authorized
  .route({
    path: "/financial-mcp/company-info",
    method: "POST",
    summary: "Test financial MCP: get company info",
  })
  .input(
    z.object({
      ticker: z.string().min(1).default("AAPL"),
    })
  )
  .handler(async ({ context, input }) => {
    const userId = context.user.email ?? context.user.id;

    const response = await arcadeClient.tools.execute({
      tool_name: "FinancialMcp.GetCompanyInfo@1.0.0",
      input: { ticker: input.ticker },
      user_id: userId,
    });

    const payload: CompanyInfoResponse = {
      tool: "get_company_info",
      ticker: input.ticker,
      data: response.output?.value ?? null,
    };

    return payload;
  });

type CompanyNewsResponse = {
  tool: string;
  ticker: string;
  articles: unknown[];
};

export const testGetCompanyNews = authorized
  .route({
    path: "/financial-mcp/company-news",
    method: "POST",
    summary: "Test financial MCP: get company news",
  })
  .input(
    z.object({
      ticker: z.string().min(1).default("AAPL"),
      maxArticles: z.number().min(1).max(10).default(5),
    })
  )
  .handler(async ({ context, input }) => {
    const userId = context.user.email ?? context.user.id;

    const response = await arcadeClient.tools.execute({
      tool_name: "FinancialMcp.GetCompanyNews@1.0.0",
      input: {
        ticker: input.ticker,
        max_articles: input.maxArticles,
      },
      user_id: userId,
    });

    const output = response.output?.value as
      | { articles?: unknown[] }
      | undefined;

    const payload: CompanyNewsResponse = {
      tool: "get_company_news",
      ticker: input.ticker,
      articles: output?.articles ?? [],
    };

    return payload;
  });

type HistoricalPricesResponse = {
  tool: string;
  ticker: string;
  period: string;
  dataPoints: unknown[];
};

export const testGetHistoricalPrices = authorized
  .route({
    path: "/financial-mcp/historical-prices",
    method: "POST",
    summary: "Test financial MCP: get historical prices",
  })
  .input(
    z.object({
      ticker: z.string().min(1).default("AAPL"),
      period: z.enum(["1mo", "3mo", "6mo", "1y", "2y"]).default("1mo"),
    })
  )
  .handler(async ({ context, input }) => {
    const userId = context.user.email ?? context.user.id;

    const response = await arcadeClient.tools.execute({
      tool_name: "FinancialMcp.GetHistoricalPrices@1.0.0",
      input: {
        ticker: input.ticker,
        period: input.period,
      },
      user_id: userId,
    });

    const output = response.output?.value as unknown[] | undefined;

    const payload: HistoricalPricesResponse = {
      tool: "get_historical_prices",
      ticker: input.ticker,
      period: input.period,
      dataPoints: output ?? [],
    };

    return payload;
  });
