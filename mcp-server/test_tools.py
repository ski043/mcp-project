"""Quick test script for MCP tools."""

import sys
sys.path.insert(0, 'src')

from financial_mcp.utils.yfinance_client import YFinanceClient

def test_stock_price():
    """Test getting stock price."""
    print("Testing get_stock_price for AAPL...")
    try:
        client = YFinanceClient()
        data = client.get_stock_info("AAPL")
        print(f"✓ Success: AAPL price = ${data['currentPrice']}")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_company_info():
    """Test getting company info."""
    print("\nTesting get_company_info for MSFT...")
    try:
        client = YFinanceClient()
        data = client.get_company_info("MSFT")
        print(f"✓ Success: {data['companyName']}")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_news():
    """Test getting company news."""
    print("\nTesting get_company_news for GOOGL...")
    try:
        client = YFinanceClient()
        news = client.get_company_news("GOOGL", max_articles=3)
        print(f"✓ Success: Found {len(news)} articles")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_historical():
    """Test getting historical prices for all periods."""
    periods = ["1mo", "3mo", "6mo", "1y", "2y"]
    client = YFinanceClient()
    all_passed = True
    
    for period in periods:
        print(f"\nTesting get_historical_prices for AAPL ({period})...")
        try:
            history = client.get_historical_prices("AAPL", period=period)
            print(f"✓ Success: Got {len(history)} data points")
        except Exception as e:
            print(f"✗ Error: {e}")
            all_passed = False
    
    return all_passed

if __name__ == "__main__":
    print("=" * 50)
    print("Financial MCP Tools Test")
    print("=" * 50)

    results = []
    results.append(test_stock_price())
    results.append(test_company_info())
    results.append(test_news())
    results.append(test_historical())

    print("\n" + "=" * 50)
    print(f"Results: {sum(results)}/{len(results)} tests passed")
    print("=" * 50)

    sys.exit(0 if all(results) else 1)
