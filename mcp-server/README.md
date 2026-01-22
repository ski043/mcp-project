# Financial MCP Server

A custom MCP (Model Context Protocol) server that provides financial data tools via Yahoo Finance. Built with the `arcade-mcp` framework and deployed to Arcade for seamless integration with AI applications.

## Overview

This server exposes financial data as tools that can be called by LLMs. Once deployed to Arcade, these tools are available to any application using the Arcade SDK, enabling AI agents to fetch real-time market data autonomously.

## Tools

| Tool | Description |
|------|-------------|
| `get_stock_price` | Current price, volume, daily change, 52-week range |
| `get_company_info` | Company fundamentals (sector, industry, market cap, P/E) |
| `get_company_news` | Recent news articles with titles and links |
| `get_historical_prices` | Historical OHLCV data for trend analysis |
| `analyze_portfolio` | Comprehensive analysis of multiple tickers at once |

## Quick Start

### Prerequisites

- Python 3.10+
- [uv package manager](https://docs.astral.sh/uv/getting-started/installation/)
- Arcade account ([arcade.dev](https://arcade.dev))

### Installation

```bash
cd mcp-server
uv sync
```

### Deploy to Arcade

```bash
arcade deploy
```

Once deployed, the tools are accessible via the Arcade SDK:

```typescript
import Arcade from "@arcadeai/arcadejs";

const arcade = new Arcade({ apiKey: process.env.ARCADE_API_KEY });

const response = await arcade.tools.execute({
  tool_name: "FinancialMcp.GetStockPrice@1.0.0",
  input: { ticker: "AAPL" },
  user_id: "user@example.com",
});
```

## Local Development

### HTTP Transport (for testing)

```bash
uv run src/financial_mcp/server.py http
```

- API Docs: http://127.0.0.1:8000/docs
- Health Check: http://127.0.0.1:8000/worker/health

### stdio Transport (for MCP clients)

```bash
uv run src/financial_mcp/server.py stdio
```

## Tool Examples

### get_stock_price

```json
{
  "ticker": "AAPL",
  "price": 178.52,
  "change_percent": 1.23,
  "previous_close": 176.35,
  "volume": 52340000,
  "market_cap": 2800000000000,
  "fifty_two_week_high": 198.23,
  "fifty_two_week_low": 164.08
}
```

### get_company_info

```json
{
  "ticker": "MSFT",
  "company_name": "Microsoft Corporation",
  "sector": "Technology",
  "industry": "Software—Infrastructure",
  "market_cap": 3100000000000,
  "pe_ratio": 35.2,
  "description": "Microsoft Corporation develops...",
  "website": "https://www.microsoft.com",
  "employees": 221000
}
```

### get_company_news

```json
{
  "articles": [
    {
      "title": "Microsoft announces new AI features",
      "publisher": "TechCrunch",
      "link": "https://...",
      "publish_time": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### get_historical_prices

```json
{
  "ticker": "TSLA",
  "period": "3mo",
  "prices": [
    { "date": "2025-01-15", "close": 245.32, "volume": 98000000 },
    { "date": "2025-01-14", "close": 243.18, "volume": 87000000 }
  ]
}
```

### analyze_portfolio

```json
{
  "tickers": ["AAPL", "MSFT", "GOOGL"],
  "analysis": {
    "AAPL": { "price": 178.52, "company": "Apple Inc.", "sector": "Technology" },
    "MSFT": { "price": 415.20, "company": "Microsoft Corporation", "sector": "Technology" },
    "GOOGL": { "price": 175.80, "company": "Alphabet Inc.", "sector": "Technology" }
  },
  "sector_breakdown": { "Technology": 100 }
}
```

## Project Structure

```
mcp-server/
├── src/
│   └── financial_mcp/
│       ├── server.py              # Main MCP app entrypoint
│       ├── tools/
│       │   ├── stock_data.py      # Price and historical data
│       │   ├── company_info.py    # Company fundamentals
│       │   ├── market_news.py     # News aggregation
│       │   └── portfolio_analysis.py  # Multi-stock analysis
│       └── utils/
│           └── yfinance_client.py # Yahoo Finance wrapper
├── pyproject.toml
└── README.md
```

## Adding New Tools

```python
from typing import Annotated

@app.tool
def my_new_tool(
    ticker: Annotated[str, "Stock ticker symbol"]
) -> str:
    """Tool description for the LLM."""
    try:
        # Implementation
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"error": str(e)})
```

## Troubleshooting

**Rate limiting**: Yahoo Finance has unofficial rate limits. Wait a few minutes if you encounter errors.

**Missing data**: Some tickers may have incomplete data. Tools return partial data or error messages in these cases.

## License

MIT
