# MCP Gateway Guide

## What is an MCP Gateway?

An **MCP Gateway** is Arcade's solution for connecting multiple MCP servers to your application, agent, or IDE through a single unified endpoint. Think of it as a **federation layer** that sits between your application and multiple MCP servers.

```
┌─────────────────────┐
│   Next.js App       │
│   (Your Agent)      │
└──────────┬──────────┘
           │
           │ HTTPS
           │
┌──────────▼──────────┐
│   MCP Gateway       │  ← Single endpoint: api.arcade.dev/mcp/your-slug
│   (Arcade)          │
└──────────┬──────────┘
           │
           ├─────────────┐
           │             │
┌──────────▼─────┐  ┌───▼──────────────┐
│ Financial MCP  │  │ Other MCP Servers│
│ (Your Server)  │  │ (GitHub, Slack)  │
└────────────────┘  └──────────────────┘
```

## Why Do We Need It?

### Problem Without MCP Gateway

If you connect MCP servers directly to your application:

1. **Multiple Connections**: Your app needs to manage connections to each MCP server separately
2. **Authentication Complexity**: Each server may have different auth mechanisms
3. **Tool Overload**: You get ALL tools from each server (80+ tools from GitHub, Linear, etc.)
4. **No Tool Filtering**: Can't pick specific tools from each server
5. **LLM Context Waste**: Sending 100+ tool definitions consumes valuable context window

### Solution With MCP Gateway

The MCP Gateway solves these problems:

1. **Single Connection**: Your app connects to one endpoint: `https://api.arcade.dev/mcp/<your-slug>`
2. **Unified Auth**: Arcade handles authentication with a single API key
3. **Tool Selection**: Cherry-pick only the tools you need from each server
4. **Tool Federation**: Combine tools from multiple servers into one curated collection
5. **Efficient Context**: Only relevant tools are exposed to your LLM

## How Does It Help Our Financial Portfolio Project?

### Current Architecture (Without Gateway)

Right now, we have:
- ✅ Python MCP server with 4 financial tools (get_stock_price, get_company_info, etc.)
- ❌ No way for Next.js to call these tools yet
- ❌ Each tool call would require direct server communication

### Future Architecture (With Gateway)

```
User Request
    ↓
Next.js API Route (with AI SDK)
    ↓
LLM (Claude) → Sees available tools from Gateway
    ↓
Tool Execution Request
    ↓
MCP Gateway (api.arcade.dev/mcp/financial-portfolio)
    ↓
Routes to Your Financial MCP Server
    ↓
Returns Data (stock price, news, etc.)
    ↓
LLM Generates Report
    ↓
Stored in PostgreSQL
```

### Benefits for Your Project

1. **Easy Integration**: Connect Next.js to your MCP server via HTTPS (no stdio complexity)
2. **Tool Management**: Add/remove tools from the gateway without code changes
3. **Multi-Server Future**: Later, you can add GitHub (for code analysis), Notion (for report publishing), Gmail (for email delivery) tools to the same gateway
4. **Production Ready**: Built-in auth, rate limiting, logging, and error handling
5. **Shareable**: The gateway URL can be used in Claude Desktop, Cursor, VS Code, or your Next.js app

## MCP Gateway Configuration Options

### Authentication Modes

**1. Arcade Auth** (Recommended for Development)
- User authenticates directly with their Arcade account
- Best for: Testing, internal tools, single-user apps
- Use case: Your demo video, development

**2. Arcade Headers** (Recommended for Production)
- Pass Arcade API key + end-user ID in headers
- Best for: Multi-user production apps
- Use case: When you deploy this for real users

```typescript
// Production usage with Arcade Headers
const response = await fetch('https://api.arcade.dev/mcp/financial-portfolio', {
  headers: {
    'Authorization': `Bearer ${ARCADE_API_KEY}`,
    'Arcade-User-ID': userId, // Your app's user ID
  }
});
```

### Tool Selection

When creating a gateway, you can:
- ✅ Select specific tools from each MCP server
- ✅ Mix tools from multiple servers (yours + Arcade's catalog)
- ✅ Keep tool count under 80 for optimal LLM performance
- ❌ You don't have to expose ALL tools from a server

**Example for your project:**
```
Financial Portfolio Gateway
├─ Financial MCP Server (Your custom server)
│  ├─ get_stock_price
│  ├─ get_company_info
│  ├─ get_company_news
│  └─ get_historical_prices
├─ Gmail MCP Server (Arcade catalog)
│  └─ send_email (for email reports)
└─ Notion MCP Server (Arcade catalog)
   └─ create_page (for Notion reports)
```

## How to Use MCP Gateway in Your Project

### Step 1: Deploy Your MCP Server

Your financial MCP server needs to be accessible via HTTPS. Options:

**Option A: Arcade Hosted** (Easiest)
- Upload your Python MCP server to Arcade
- They host it for you
- Automatically available in gateway tool picker

**Option B: Self-Hosted**
- Deploy your MCP server to a cloud service (Railway, Render, Fly.io)
- Run it in HTTP mode: `uv run src/financial_mcp/server.py http`
- Register the URL with Arcade

**Option C: Local Development**
- Use ngrok/cloudflare tunnel to expose localhost
- Good for testing, not for production

### Step 2: Create MCP Gateway

1. Go to [MCP Gateways Dashboard](https://api.arcade.dev/dashboard/mcp-gateways)
2. Click "Create MCP Gateway"
3. Configure:
   - **Name**: "Financial Portfolio Agent"
   - **Description**: "Tools for stock analysis and portfolio reporting"
   - **Slug**: "financial-portfolio" (URL becomes: `api.arcade.dev/mcp/financial-portfolio`)
   - **Auth**: "Arcade Auth" (for development)
   - **Tools**: Select your 4 financial tools

### Step 3: Connect to Next.js

In your Next.js app, use Vercel AI SDK with MCP provider:

```typescript
// app/api/chat/route.ts
import { createMCPClient } from '@arcade/mcp-client';

const mcpClient = createMCPClient({
  gatewayUrl: 'https://api.arcade.dev/mcp/financial-portfolio',
  apiKey: process.env.ARCADE_API_KEY,
});

export async function POST(req: Request) {
  const { messages, portfolioId } = await req.json();

  // LLM can now call your financial tools via gateway
  const result = await generateText({
    model: anthropic('claude-sonnet-4'),
    messages,
    tools: mcpClient.getTools(), // Gets tools from gateway
    onToolCall: mcpClient.executeTool, // Executes via gateway
  });

  return result;
}
```

### Step 4: Agent Workflow

```typescript
// Example: Generate portfolio report
const userMessage = "Analyze my portfolio and generate a report";

// LLM sees these tools from gateway:
// - get_stock_price
// - get_company_info
// - get_company_news
// - get_historical_prices

// LLM decides: "I need to fetch data for each holding"
// 1. Calls get_stock_price("AAPL")
// 2. Calls get_company_news("AAPL")
// 3. Calls get_historical_prices("AAPL", "1mo")
// ... repeats for each ticker

// Gateway routes each call to your MCP server
// Your server returns data
// LLM synthesizes into report
// You save to PostgreSQL
```

## Key Concepts

### Tool Federation
Combine tools from multiple sources into one cohesive toolkit:
- Your custom financial tools
- Arcade's pre-built integrations (Gmail, Notion, Slack)
- Other community MCP servers

### Tool Routing
The gateway knows which MCP server owns each tool and routes accordingly:
```
get_stock_price → Your Financial MCP Server
send_email → Arcade Gmail MCP Server
create_notion_page → Arcade Notion MCP Server
```

### Security & Authorization
- Gateway enforces authentication before reaching your server
- User OAuth handled by Arcade (GitHub, Notion, Gmail auth flows)
- Your server doesn't need to implement auth

## Best Practices

1. **Keep Tool Count Low**: Under 80 tools per gateway for optimal LLM performance
2. **Use Descriptive Names**: Gateway names should be clear (e.g., "financial-portfolio" not "gateway-1")
3. **Production Auth**: Use "Arcade Headers" mode for multi-user production apps
4. **Tool Instructions**: Add clear instructions in tool descriptions for the LLM
5. **Error Handling**: Your MCP tools should return structured errors (you already do this!)

## Next Steps for Your Project

1. ✅ **Complete** - Build Python MCP server with financial tools
2. ✅ **Complete** - Test tools locally (all 4/4 passing)
3. 🔄 **Next** - Deploy MCP server (or use local tunnel for testing)
4. 🔄 **Next** - Create MCP Gateway on Arcade dashboard
5. 🔄 **Next** - Connect Next.js to gateway via Arcade SDK
6. 🔄 **Next** - Build agent orchestration in Next.js API routes
7. 🔄 **Next** - Add multi-output formatting (email, Notion, dashboard)

## Common Questions

**Q: Can I use the gateway in Claude Desktop/Cursor?**
Yes! The same gateway URL works in any MCP-compatible client.

**Q: Do I need to pay for the gateway?**
Check Arcade's pricing. They have free tiers for development.

**Q: Can I run this without Arcade?**
Yes, but you'd need to build your own federation layer or connect MCP servers directly to your app (more complex).

**Q: What's the latency overhead?**
Minimal - gateway adds ~50-100ms for routing, much less than tool execution time.

**Q: Can I have multiple gateways?**
Yes! Create different gateways for different use cases (e.g., one for portfolio analysis, one for trading operations).

---

## Resources

- [Arcade MCP Gateway Dashboard](https://api.arcade.dev/dashboard/mcp-gateways)
- [Arcade MCP Gateway Docs](https://docs.arcade.dev/guides/create-tools/mcp-gateways)
- [Your MCP Server](../mcp-server/README.md)
