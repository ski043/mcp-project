"""Yahoo Finance client wrapper with error handling."""

import yfinance as yf
from typing import Dict, List, Any
from datetime import datetime, timezone


class YFinanceClient:
    """
    Wrapper around yfinance with error handling and data normalization.

    Provides clean interfaces for fetching stock data, company info, and news
    with graceful error handling for common yfinance issues.
    """

    @staticmethod
    def get_stock_info(ticker: str) -> Dict[str, Any]:
        """
        Get comprehensive stock information including price and metrics.

        Args:
            ticker: Stock ticker symbol (e.g., "AAPL", "MSFT")

        Returns:
            Dict containing stock info including current price, market cap, etc.

        Raises:
            ValueError: If ticker is invalid or data cannot be fetched
        """
        try:
            stock = yf.Ticker(ticker)
            info = stock.info

            # Check if we got valid data
            if not info or (
                "currentPrice" not in info
                and "regularMarketPrice" not in info
            ):
                raise ValueError(f"No data available for ticker: {ticker}")

            # Normalize the data structure - handle multiple possible field names
            current_price = info.get("currentPrice")
            if current_price is None:
                current_price = info.get("regularMarketPrice")

            previous_close = info.get("previousClose")
            if previous_close is None:
                previous_close = info.get("regularMarketPreviousClose")

            # Calculate change percentage if we have both prices
            change_percent = None
            if current_price is not None and previous_close is not None and previous_close > 0:
                change_percent = ((current_price - previous_close) / previous_close) * 100

            return {
                "ticker": ticker.upper(),
                "currentPrice": current_price,
                "previousClose": previous_close,
                "changePercent": round(change_percent, 2) if change_percent is not None else None,
                "marketCap": info.get("marketCap"),
                "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
                "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
                "currency": info.get("currency", "USD"),
                "regularMarketVolume": info.get("regularMarketVolume"),
            }
        except Exception as e:
            raise ValueError(f"Error fetching stock info for {ticker}: {str(e)}")

    @staticmethod
    def get_company_info(ticker: str) -> Dict[str, Any]:
        """
        Get detailed company information.

        Args:
            ticker: Stock ticker symbol

        Returns:
            Dict containing company details like name, sector, industry, etc.

        Raises:
            ValueError: If ticker is invalid or company data unavailable
        """
        try:
            stock = yf.Ticker(ticker)
            info = stock.info

            # Check if we got valid company data
            if not info or ("longName" not in info and "shortName" not in info):
                raise ValueError(f"No company data available for ticker: {ticker}")

            return {
                "ticker": ticker.upper(),
                "companyName": info.get("longName") or info.get("shortName"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "description": info.get("longBusinessSummary"),
                "website": info.get("website"),
                "employees": info.get("fullTimeEmployees"),
                "city": info.get("city"),
                "state": info.get("state"),
                "country": info.get("country"),
            }
        except Exception as e:
            raise ValueError(f"Error fetching company info for {ticker}: {str(e)}")

    @staticmethod
    def get_historical_prices(ticker: str, period: str = "1mo") -> List[Dict[str, Any]]:
        """
        Get historical price data (daily close prices).

        Uses repair=True to fix Yahoo's data errors.

        Args:
            ticker: Stock ticker symbol
            period: Time period - "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"

        Returns:
            List of dicts with date and close_price

        Raises:
            ValueError: If ticker invalid, period invalid, or data unavailable
        """
        valid_periods = ["1mo", "3mo", "6mo", "1y", "2y", "5y", "max"]
        if period not in valid_periods:
            raise ValueError(f"Invalid period: {period}. Must be one of {valid_periods}")

        try:
            stock = yf.Ticker(ticker)
            # Use repair=True to fix Yahoo's data errors
            hist = stock.history(period=period, repair=True)

            if hist.empty:
                raise ValueError(f"No historical data available for ticker: {ticker}")

            # Convert to list of date/price dicts
            result = []
            for date, row in hist.iterrows():
                result.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "close_price": round(float(row["Close"]), 2)
                })

            return result
        except ValueError:
            # Re-raise ValueError as-is (our custom messages)
            raise
        except Exception as e:
            raise ValueError(f"Error fetching historical prices for {ticker}: {str(e)}")

    @staticmethod
    def get_company_news(ticker: str, max_articles: int = 5) -> List[Dict[str, Any]]:
        """
        Get recent news articles for a company.

        Args:
            ticker: Stock ticker symbol
            max_articles: Maximum number of articles to return (capped at 10)

        Returns:
            List of news article dicts with title, publisher, link, publish_time

        Raises:
            ValueError: If ticker invalid or error fetching news
        """
        # Cap at 10 articles as per yfinance limits
        if max_articles > 10:
            max_articles = 10

        try:
            stock = yf.Ticker(ticker)
            # Use get_news method with count parameter
            news = stock.get_news(count=max_articles)

            if not news:
                # Return empty list if no news, not an error
                return []

            # Normalize news data
            result = []
            for article in news:
                # Convert Unix timestamp to ISO format
                publish_time = None
                if article.get("providerPublishTime"):
                    publish_time = datetime.fromtimestamp(
                        article["providerPublishTime"],
                        tz=timezone.utc
                    ).isoformat()

                result.append({
                    "title": article.get("title"),
                    "publisher": article.get("publisher"),
                    "link": article.get("link"),
                    "publish_time": publish_time,
                })

            return result
        except Exception as e:
            raise ValueError(f"Error fetching news for {ticker}: {str(e)}")
