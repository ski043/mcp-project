"""Financial MCP Server - Main entrypoint."""

import sys
from pathlib import Path

# Add parent directory to path for module imports
if __name__ == "__main__":
    # When running directly, add src to path
    src_dir = Path(__file__).parent.parent
    if str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))

from arcade_mcp_server import MCPApp
from financial_mcp.tools.company_info import register_company_info_tools
from financial_mcp.tools.market_news import register_news_tools
from financial_mcp.tools.stock_data import register_stock_tools
from financial_mcp.tools.portfolio_analysis import register_portfolio_analysis_tools
from financial_mcp.tools.earnings_calendar import register_earnings_calendar_tools

# Initialize MCP App
app = MCPApp(
    name="financial_mcp",
    version="1.0.0",
    title="Financial Portfolio MCP Server",
    instructions="Provides financial data tools via Yahoo Finance for stock prices, company info, news, and historical data",
    log_level="DEBUG"
)

register_stock_tools(app)
register_company_info_tools(app)
register_news_tools(app)
register_portfolio_analysis_tools(app)
register_earnings_calendar_tools(app)


if __name__ == "__main__":
    # Get transport from command line argument, default to "stdio"
    # - "stdio" (default): Standard I/O for Claude Desktop, CLI tools, etc.
    # - "http": HTTPS streaming for Cursor, VS Code, etc.
    transport = sys.argv[1] if len(sys.argv) > 1 else "stdio"

    # Run the server
    app.run(transport=transport, host="127.0.0.1", port=8000)
