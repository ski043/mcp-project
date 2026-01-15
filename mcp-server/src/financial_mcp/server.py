"""Financial MCP Server - Main entrypoint."""

import sys
import json
from typing import Annotated
from arcade_mcp_server import MCPApp
from financial_mcp.utils.yfinance_client import YFinanceClient

# Initialize MCP App
app = MCPApp(
    name="financial_mcp",
    version="1.0.0",
    title="Financial Portfolio MCP Server",
    instructions="Provides financial data tools via Yahoo Finance for stock prices, company info, news, and historical data",
    log_level="DEBUG"
)


@app.tool
def get_stock_price(
    ticker: Annotated[str, "Stock ticker symbol (e.g., 'AAPL', 'MSFT', 'GOOGL')"]
) -> str:
    """
    Fetch the current stock price and key metrics for a given ticker.

    Returns JSON string with current price, change percentage, previous close,
    market cap, 52-week high/low, and trading volume.

    Example: get_stock_price("AAPL")
    """
    try:
        client = YFinanceClient()
        data = client.get_stock_info(ticker)

        result = {
            "ticker": data["ticker"],
            "price": data["currentPrice"],
            "previous_close": data["previousClose"],
            "change_percent": data["changePercent"],
            "market_cap": data["marketCap"],
            "fifty_two_week_high": data["fiftyTwoWeekHigh"],
            "fifty_two_week_low": data["fiftyTwoWeekLow"],
            "currency": data["currency"],
            "volume": data["regularMarketVolume"]
        }

        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "ticker": ticker})


@app.tool
def get_company_info(
    ticker: Annotated[str, "Stock ticker symbol (e.g., 'AAPL', 'MSFT', 'GOOGL')"]
) -> str:
    """
    Get detailed company information for a given ticker.

    Returns JSON string with company name, sector, industry, description,
    website, employee count, and location.

    Example: get_company_info("MSFT")
    """
    try:
        client = YFinanceClient()
        data = client.get_company_info(ticker)

        result = {
            "ticker": data["ticker"],
            "company_name": data["companyName"],
            "sector": data["sector"],
            "industry": data["industry"],
            "description": data["description"],
            "website": data["website"],
            "employees": data["employees"],
            "city": data["city"],
            "state": data["state"],
            "country": data["country"]
        }

        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "ticker": ticker})


@app.tool
def get_company_news(
    ticker: Annotated[str, "Stock ticker symbol (e.g., 'AAPL', 'MSFT', 'GOOGL')"],
    max_articles: Annotated[int, "Maximum number of articles to return (default: 5, max: 10)"] = 5
) -> str:
    """
    Fetch recent news articles for a company.

    Returns JSON string with list of news articles including title, publisher,
    link, and publish time.

    Example: get_company_news("TSLA", max_articles=5)
    """
    try:
        client = YFinanceClient()
        news = client.get_company_news(ticker, max_articles)

        result = {
            "ticker": ticker.upper(),
            "article_count": len(news),
            "articles": news
        }

        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "ticker": ticker})


@app.tool
def get_historical_prices(
    ticker: Annotated[str, "Stock ticker symbol (e.g., 'AAPL', 'MSFT', 'GOOGL')"],
    period: Annotated[str, "Time period: '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max' (default: '1mo')"] = "1mo"
) -> str:
    """
    Fetch historical daily close prices for a given ticker.

    Returns JSON string with list of date/price objects showing daily close prices
    for the specified period. Uses Yahoo Finance's repair feature to fix data errors.

    Example: get_historical_prices("AAPL", period="3mo")
    """
    try:
        client = YFinanceClient()
        history = client.get_historical_prices(ticker, period)

        result = {
            "ticker": ticker.upper(),
            "period": period,
            "data_points": len(history),
            "prices": history
        }

        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "ticker": ticker, "period": period})


if __name__ == "__main__":
    # Support both stdio and http transports
    # Default to stdio if no argument provided
    transport = sys.argv[1] if len(sys.argv) > 1 else "stdio"

    if transport == "http":
        # HTTP mode for development with hot reload
        app.run(transport="http", host="127.0.0.1", port=8000, reload=True)
    else:
        # stdio mode for production MCP clients
        app.run(transport="stdio")
