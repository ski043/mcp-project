"""Portfolio analysis tool - aggregates multiple data sources for comprehensive analysis."""

import json
from typing import Annotated, List
from financial_mcp.utils.yfinance_client import YFinanceClient


def register_portfolio_analysis_tools(app):
    """Register portfolio analysis tools with the MCP app."""

    @app.tool
    def analyze_portfolio(
        tickers: Annotated[List[str], "List of stock ticker symbols (e.g., ['AAPL', 'MSFT', 'GOOGL'])"]
    ) -> str:
        """
        Analyze a portfolio of stocks and provide comprehensive data for investment insights.

        Fetches current prices, company information, and recent news for all provided tickers.
        Calculates portfolio-level metrics including best/worst performers and sector allocation.

        Returns JSON with:
        - Individual holding data (price, company info, news)
        - Portfolio metrics (total holdings, sector breakdown)
        - Performance ranking

        Example: analyze_portfolio(["AAPL", "NVDA", "MSFT", "GOOGL"])
        """
        if not tickers:
            return json.dumps({"error": "No tickers provided"})

        if len(tickers) > 20:
            return json.dumps({"error": "Maximum 20 tickers allowed per analysis"})

        client = YFinanceClient()
        holdings = []
        errors = []

        for ticker in tickers:
            ticker = ticker.upper().strip()
            holding_data = {"ticker": ticker}

            # Fetch stock price
            try:
                stock_info = client.get_stock_info(ticker)
                holding_data["price"] = stock_info.get("currentPrice")
                holding_data["change_percent"] = stock_info.get("changePercent")
                holding_data["market_cap"] = stock_info.get("marketCap")
                holding_data["fifty_two_week_high"] = stock_info.get("fiftyTwoWeekHigh")
                holding_data["fifty_two_week_low"] = stock_info.get("fiftyTwoWeekLow")
            except Exception as e:
                holding_data["price_error"] = str(e)
                errors.append(f"{ticker}: price fetch failed")

            # Fetch company info
            try:
                company_info = client.get_company_info(ticker)
                holding_data["company_name"] = company_info.get("companyName")
                holding_data["sector"] = company_info.get("sector")
                holding_data["industry"] = company_info.get("industry")
                holding_data["description"] = company_info.get("description")
            except Exception as e:
                holding_data["company_error"] = str(e)
                errors.append(f"{ticker}: company info failed")

            # Fetch recent news (limit to 3 per ticker for performance)
            try:
                news = client.get_company_news(ticker, max_articles=3)
                holding_data["recent_news"] = [
                    {"title": n["title"], "publisher": n["publisher"]}
                    for n in news
                ]
            except Exception as e:
                holding_data["news_error"] = str(e)
                errors.append(f"{ticker}: news fetch failed")

            holdings.append(holding_data)

        # Calculate portfolio metrics
        valid_holdings = [h for h in holdings if h.get("price") is not None]

        # Sort by daily change to find best/worst performers
        sorted_by_change = sorted(
            [h for h in valid_holdings if h.get("change_percent") is not None],
            key=lambda x: x["change_percent"],
            reverse=True
        )

        best_performer = sorted_by_change[0] if sorted_by_change else None
        worst_performer = sorted_by_change[-1] if sorted_by_change else None

        # Sector breakdown
        sectors = {}
        for h in valid_holdings:
            sector = h.get("sector") or "Unknown"
            sectors[sector] = sectors.get(sector, 0) + 1

        result = {
            "portfolio_summary": {
                "total_holdings": len(tickers),
                "successfully_fetched": len(valid_holdings),
                "sectors": sectors,
                "best_performer_today": {
                    "ticker": best_performer["ticker"],
                    "change_percent": best_performer["change_percent"]
                } if best_performer else None,
                "worst_performer_today": {
                    "ticker": worst_performer["ticker"],
                    "change_percent": worst_performer["change_percent"]
                } if worst_performer else None,
            },
            "holdings": holdings,
            "errors": errors if errors else None
        }

        return json.dumps(result, indent=2)
