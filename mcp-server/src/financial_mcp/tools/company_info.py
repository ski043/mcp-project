"""Company information tools."""

import json
from typing import Annotated
from financial_mcp.utils.yfinance_client import YFinanceClient


def register_company_info_tools(app):
    """Register company information tools with the MCP app."""

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
