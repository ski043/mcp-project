"""Market news tools."""

import json
from typing import Annotated
from financial_mcp.utils.yfinance_client import YFinanceClient


def register_news_tools(app):
    """Register news fetching tools with the MCP app."""

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
