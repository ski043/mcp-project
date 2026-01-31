# Financial MCP Server

MCPMarshal includes a custom MCP (Model Context Protocol) server that provides financial data tools. This server is built with Python and deployed to Arcade, making the tools available to AI agents.

## What is MCP?

MCP (Model Context Protocol) is a standard for exposing tools to LLMs. Instead of hardcoding API calls, you define tools that LLMs can discover and invoke autonomously.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Agent      │────▶│     Arcade      │────▶│   MCP Server    │
│ (MCPMarshal)    │     │   (Gateway)     │     │ (Financial MCP) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ "Get AAPL price"      │                       │
        │──────────────────────▶│                       │
        │                       │ Execute tool          │
        │                       │──────────────────────▶│
        │                       │                       │ yfinance
        │                       │                       │───────▶
        │                       │      Result           │
        │◀──────────────────────│◀──────────────────────│
        │                       │                       │
```

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `GetStockPrice` | Current price, volume, daily change, 52-week range | `ticker` |
| `GetCompanyInfo` | Company name, sector, industry, description | `ticker` |
| `GetCompanyNews` | Recent news articles with titles and links | `ticker`, `max_articles` |
| `GetHistoricalPrices` | Historical daily close prices | `ticker`, `period` |
| `AnalyzePortfolio` | Comprehensive analysis of multiple tickers | `tickers` (array) |

## Tool Details

### GetStockPrice

Fetches real-time stock data from Yahoo Finance.

**Input:**
```json
{ "ticker": "AAPL" }
```

**Output:**
```json
{
  "ticker": "AAPL",
  "price": 178.52,
  "previous_close": 176.35,
  "change_percent": 1.23,
  "market_cap": 2800000000000,
  "fifty_two_week_high": 198.23,
  "fifty_two_week_low": 164.08,
  "currency": "USD",
  "volume": 52340000
}
```

### GetCompanyInfo

Fetches company fundamentals and metadata.

**Input:**
```json
{ "ticker": "MSFT" }
```

**Output:**
```json
{
  "ticker": "MSFT",
  "companyName": "Microsoft Corporation",
  "sector": "Technology",
  "industry": "Software - Infrastructure",
  "description": "Microsoft Corporation develops and licenses...",
  "website": "https://www.microsoft.com",
  "employees": 221000,
  "city": "Redmond",
  "state": "WA",
  "country": "United States"
}
```

### GetCompanyNews

Fetches recent news articles for a company.

**Input:**
```json
{ "ticker": "NVDA", "max_articles": 5 }
```

**Output:**
```json
{
  "articles": [
    {
      "title": "NVIDIA announces new AI chip",
      "publisher": "Reuters",
      "link": "https://...",
      "publish_time": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### GetHistoricalPrices

Fetches historical daily close prices for trend analysis.

**Input:**
```json
{ "ticker": "TSLA", "period": "3mo" }
```

**Supported periods:** `1mo`, `3mo`, `6mo`, `1y`, `2y`, `5y`, `max`

**Output:**
```json
{
  "ticker": "TSLA",
  "period": "3mo",
  "data_points": 63,
  "prices": [
    { "date": "2025-01-15", "close_price": 245.32 },
    { "date": "2025-01-14", "close_price": 243.18 }
  ]
}
```

### AnalyzePortfolio

Comprehensive analysis of multiple stocks at once. Useful for portfolio-wide insights.

**Input:**
```json
{ "tickers": ["AAPL", "MSFT", "GOOGL", "NVDA"] }
```

**Output:**
```json
{
  "portfolio_summary": {
    "total_holdings": 4,
    "successfully_fetched": 4,
    "sectors": { "Technology": 4 },
    "best_performer_today": { "ticker": "NVDA", "change_percent": 3.45 },
    "worst_performer_today": { "ticker": "GOOGL", "change_percent": -0.82 }
  },
  "holdings": [
    {
      "ticker": "AAPL",
      "price": 178.52,
      "change_percent": 1.23,
      "company_name": "Apple Inc.",
      "sector": "Technology",
      "recent_news": [{ "title": "...", "publisher": "..." }]
    }
  ]
}
```

## Architecture

```
mcp-server/
├── src/
│   └── financial_mcp/
│       ├── __init__.py
│       ├── server.py              # MCP app entrypoint
│       ├── tools/
│       │   ├── __init__.py
│       │   ├── stock_data.py      # GetStockPrice, GetHistoricalPrices
│       │   ├── company_info.py    # GetCompanyInfo
│       │   ├── market_news.py     # GetCompanyNews
│       │   └── portfolio_analysis.py  # AnalyzePortfolio
│       └── utils/
│           ├── __init__.py
│           └── yfinance_client.py # Yahoo Finance wrapper
├── pyproject.toml                 # Dependencies
├── uv.lock                        # Lock file
└── README.md
```

## How Tools Are Defined

Tools use Python type annotations for parameter schemas:

```python
from typing import Annotated

@app.tool
def get_stock_price(
    ticker: Annotated[str, "Stock ticker symbol (e.g., 'AAPL')"]
) -> str:
    """
    Fetch the current stock price and key metrics.
    
    Returns JSON with price, change, volume, and 52-week range.
    """
    try:
        client = YFinanceClient()
        data = client.get_stock_info(ticker)
        return json.dumps(data)
    except Exception as e:
        return json.dumps({"error": str(e)})
```

The `Annotated` type provides parameter descriptions for the LLM.

## Data Source: Yahoo Finance

All data comes from Yahoo Finance via the `yfinance` Python library:

```python
import yfinance as yf

stock = yf.Ticker("AAPL")
info = stock.info          # Company data
history = stock.history()  # Historical prices
news = stock.get_news()    # Recent articles
```

### Known Issues

**Rate limiting**: Yahoo Finance has unofficial rate limits. The server handles errors gracefully but may return partial data under heavy load.

**Data availability**: Some tickers (especially non-US) may have incomplete data. Tools return what's available without failing.

**Historical data**: The `repair=True` option in yfinance can cause issues in some environments. The server uses the default behavior instead.

## Local Development

### Prerequisites

- Python 3.10+
- [uv package manager](https://docs.astral.sh/uv/)

### Setup

```bash
cd mcp-server
uv sync
```

### Run locally (HTTP mode)

```bash
uv run src/financial_mcp/server.py http
```

- API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/worker/health

### Run locally (stdio mode)

For use with MCP clients like Claude Desktop:

```bash
uv run src/financial_mcp/server.py stdio
```

### Test tools directly

```bash
cd mcp-server
uv run python test_tools.py
```

## Deployment to Arcade

### Install Arcade CLI

First, install the Arcade CLI as a system-wide tool:

```bash
uv tool install arcade-mcp
```

Or with pip:

```bash
pip install arcade-mcp
```

### Deploy

Run the deploy command from the directory containing `pyproject.toml`, specifying the entrypoint:

```bash
cd mcp-server
arcade deploy -e src/financial_mcp/server.py
```

The CLI will:
1. Validate you're logged in
2. Load environment variables from `.env`
3. Start the server locally to validate it's healthy
4. Extract metadata (name, version, tools)
5. Upload any required secrets
6. Deploy to Arcade Cloud

### Manage in Arcade Dashboard

After deployment, manage your server at [api.arcade.dev/dashboard/servers](https://api.arcade.dev/dashboard/servers):

- Monitor health status
- Test and execute tools
- Manage secrets
- Create MCP Gateways

### Create an MCP Gateway

To use your tools from MCP clients (Claude Desktop, Cursor, etc.), create an MCP Gateway in the Arcade dashboard. Gateways let you pick which tools to expose to specific clients.

### Call from Arcade SDK

When using the Arcade SDK directly (like MCPMarshal does), you don't need an MCP Gateway. The SDK connects to all tools in your project:

```typescript
import Arcade from "@arcadeai/arcadejs";

const arcade = new Arcade({ apiKey: process.env.ARCADE_API_KEY });

// Get current price
const priceResult = await arcade.tools.execute({
  tool_name: "FinancialMcp.GetStockPrice@1.0.0",
  input: { ticker: "AAPL" },
  user_id: "user@example.com",
});

// Parse the result
const priceData = JSON.parse(priceResult.output?.value as string);
console.log(`AAPL: $${priceData.price}`);
```

### Tool naming convention

Once deployed, tools are accessible as:
- `FinancialMcp.GetStockPrice@1.0.0`
- `FinancialMcp.GetCompanyInfo@1.0.0`
- `FinancialMcp.GetCompanyNews@1.0.0`
- `FinancialMcp.GetHistoricalPrices@1.0.0`
- `FinancialMcp.AnalyzePortfolio@1.0.0`

## Adding New Tools

1. Create a new file in `tools/` or add to existing file
2. Define the tool function with type annotations
3. Register with the app in `server.py`

Example:

```python
# tools/new_tool.py
import json
from typing import Annotated

def register_new_tools(app):
    
    @app.tool
    def get_dividend_info(
        ticker: Annotated[str, "Stock ticker symbol"]
    ) -> str:
        """Get dividend information for a stock."""
        try:
            # Implementation
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e)})
```

```python
# server.py
from financial_mcp.tools.new_tool import register_new_tools

# Add to registrations
register_new_tools(app)
```

Then redeploy:

```bash
arcade deploy -e src/financial_mcp/server.py
```

## Dependencies

```toml
[project]
dependencies = [
    "arcade-mcp>=0.1.0",    # MCP framework
    "yfinance>=0.2.49",     # Yahoo Finance client
    "python-dotenv>=1.0.0", # Environment variables
    "scipy>=1.11.0",        # For yfinance calculations
]
```

## YFinanceClient

The `yfinance_client.py` wrapper provides:

- **Error handling**: Graceful failures with descriptive messages
- **Data normalization**: Consistent field names across different Yahoo Finance responses
- **Type conversion**: Ensures JSON-serializable output (no numpy/pandas types)

```python
class YFinanceClient:
    @staticmethod
    def get_stock_info(ticker: str) -> Dict[str, Any]:
        """Get current price and metrics."""
        
    @staticmethod
    def get_company_info(ticker: str) -> Dict[str, Any]:
        """Get company fundamentals."""
        
    @staticmethod
    def get_historical_prices(ticker: str, period: str) -> List[Dict]:
        """Get historical daily close prices."""
        
    @staticmethod
    def get_company_news(ticker: str, max_articles: int) -> List[Dict]:
        """Get recent news articles."""
```

## Environment Variables

For local development, create `.env`:

```env
# Optional: Override default settings
LOG_LEVEL=DEBUG
```

For production deployment, Arcade handles environment configuration.

## Troubleshooting

### "No data available for ticker"

The ticker may be invalid or Yahoo Finance doesn't have data for it. Try a well-known ticker like AAPL or MSFT.

### "output array is read-only"

This was a Pandas Copy-on-Write issue. Fixed by removing `repair=True` from yfinance history calls and using `.tolist()` for data conversion.

### Rate limit errors

Wait a few minutes. Yahoo Finance has unofficial rate limits that reset over time.

### Missing news

Some tickers have no recent news. The tool returns an empty array instead of failing.
