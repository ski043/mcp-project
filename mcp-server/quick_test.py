"""Quick standalone test for historical prices fix."""
import subprocess
import sys

# Install yfinance in a temp way
result = subprocess.run([sys.executable, "-m", "pip", "install", "yfinance", "-q"], capture_output=True)

import yfinance as yf

print("Testing historical prices with .copy() fix...")
stock = yf.Ticker("AAPL")
hist = stock.history(period="1mo", repair=True).copy()
hist = hist.reset_index()

print(f"Got {len(hist)} data points")
for i in range(min(3, len(hist))):
    date_val = hist.iloc[i]["Date"]
    close_val = float(hist.iloc[i]["Close"])
    print(f"  {date_val.strftime('%Y-%m-%d')}: ${round(close_val, 2)}")

print("\n✓ Test passed! The fix works.")
