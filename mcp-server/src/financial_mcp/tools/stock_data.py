"""Stock price and historical data tools."""

import json
from typing import Annotated
from financial_mcp.utils.yfinance_client import YFinanceClient


def register_stock_tools(app):
    """Register stock data tools with the MCP app."""

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
