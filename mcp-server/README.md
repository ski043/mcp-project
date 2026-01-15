# Financial MCP Server

MCP server providing financial data tools via Yahoo Finance. Built with `arcade-mcp` framework.

## Features

This server provides 4 core financial data tools:

1. **get_stock_price** - Fetch current price and key metrics for a stock ticker
2. **get_company_info** - Get detailed company information
3. **get_company_news** - Fetch recent news articles for a company
4. **get_historical_prices** - Get historical price data (daily close prices)

## Prerequisites

- Python 3.10 or higher
- [`uv` package manager](https://docs.astral.sh/uv/getting-started/installation/)

## Installation

1. Navigate to the mcp-server directory:
```bash
cd mcp-server
```

2. Install dependencies:
```bash
uv sync
```

3. (Optional) Create a `.env` file from the example:
```bash
cp .env.example .env
```

## Usage

### Running with HTTP Transport (Development)

Start the server with HTTP transport for development and testing:

```bash
uv run src/financial_mcp/server.py http
```

Access:
- **API Documentation**: http://127.0.0.1:8000/docs
- **Health Check**: http://127.0.0.1:8000/worker/health

### Running with stdio Transport (Production)

Start the server with stdio transport (default for MCP clients):

```bash
uv run src/financial_mcp/server.py stdio
```

Or simply:

```bash
uv run src/financial_mcp/server.py
```

### Connecting MCP Clients

To connect Claude Desktop, Cursor, or VS Code to this server:

```bash
# Install arcade CLI if not already installed
uv tool install arcade-mcp

# Configure your preferred client
arcade configure claude  # For Claude Desktop
arcade configure cursor  # For Cursor IDE
arcade configure vscode  # For VS Code
```

## Tool Examples

### get_stock_price

Fetch current price and metrics for AAPL:
```json
{
  "ticker": "AAPL",
  "price": 178.52,
  "change_percent": 1.23,
  "previous_close": 176.35,
  "market_cap": 2800000000000,
  "fifty_two_week_high": 198.23,
  "fifty_two_week_low": 164.08,
  "currency": "USD"
}
```

### get_company_info

Get company information for MSFT:
```json
{
  "ticker": "MSFT",
  "company_name": "Microsoft Corporation",
  "sector": "Technology",
  "industry": "Software—Infrastructure",
  "description": "Microsoft Corporation develops...",
  "website": "https://www.microsoft.com",
  "employees": 221000
}
```

### get_company_news

Fetch recent news for GOOGL:
```json
[
  {
    "title": "Google announces new AI features",
    "publisher": "TechCrunch",
    "link": "https://...",
    "publish_time": "2025-01-15T10:30:00Z"
  }
]
```

### get_historical_prices

Get 1-month historical prices for TSLA:
```json
[
  {
    "date": "2025-01-15",
    "close_price": 245.32
  },
  {
    "date": "2025-01-14",
    "close_price": 243.18
  }
]
```

## Architecture

```
financial-mcp/
├── src/
│   └── financial_mcp/
│       ├── server.py           # Main MCPApp entrypoint
│       ├── tools/              # Tool implementations
│       │   ├── stock_data.py   # Price & historical data tools
│       │   ├── company_info.py # Company information tool
│       │   └── market_news.py  # News fetching tool
│       └── utils/
│           └── yfinance_client.py  # Yahoo Finance wrapper
├── pyproject.toml             # Dependencies
└── README.md                  # This file
```

## Development

### Adding New Tools

1. Create a new tool function in the appropriate file under `tools/`
2. Use the `@app.tool` decorator with type annotations
3. Follow the pattern of existing tools for error handling

Example:
```python
from typing import Annotated

@app.tool
def my_new_tool(
    ticker: Annotated[str, "Stock ticker symbol"]
) -> str:
    """Tool description for LLM."""
    try:
        # Implementation
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"error": str(e)})
```

### Testing

Start the HTTP server and use the Swagger UI at http://127.0.0.1:8000/docs to test tools interactively.

## Troubleshooting

### `arcade` command not found

Ensure you installed arcade-mcp as a uv tool:
```bash
uv tool install arcade-mcp
```

### Yahoo Finance rate limits

If you encounter rate limiting, wait a few minutes before retrying. Yahoo Finance has unofficial rate limits on their web endpoints.

### Missing data for ticker

Some tickers may not have complete data. The tools will return partial data or error messages in these cases.

## Next Steps

- Integrate with Next.js app via Arcade Gateway
- Add portfolio management tools
- Implement data caching for better performance
- Add more comprehensive financial analysis tools

## License

MIT
