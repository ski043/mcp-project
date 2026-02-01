"""Earnings calendar tool."""

import json
from typing import Annotated
import yfinance as yf


def register_earnings_calendar_tools(app):
    """Register earnings calendar tools with the MCP app."""

    @app.tool
    def get_earnings_calendar(
        limit: Annotated[int, "Number of upcoming earnings to return (default: 10, max: 50)"] = 10
    ) -> str:
        """
        Get upcoming earnings announcements for the next 7 days.

        Returns a list of companies reporting earnings soon, including
        ticker, company name, earnings date, and EPS estimates.

        Example: get_earnings_calendar(limit=10)
        """
        try:
            limit = min(limit, 50)  # Cap at 50
            
            calendars = yf.Calendars()
            df = calendars.get_earnings_calendar(limit=limit)
            
            # Convert DataFrame to list of dicts
            earnings = df.to_dict(orient="records") if not df.empty else []
            
            result = {
                "count": len(earnings),
                "earnings": earnings
            }
            
            return json.dumps(result, indent=2, default=str)
        except Exception as e:
            return json.dumps({"error": str(e)})
