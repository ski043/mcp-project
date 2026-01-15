"""Financial MCP Server - Main entrypoint."""

import sys
from arcade_mcp_server import MCPApp
from financial_mcp.tools.company_info import register_company_info_tools
from financial_mcp.tools.market_news import register_news_tools
from financial_mcp.tools.stock_data import register_stock_tools

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
