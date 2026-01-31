# AI Chat

MCPMarshal includes an intelligent AI chat that can autonomously fetch real-time financial data, access your portfolio, and interact with external services like Gmail and Slack.

## Overview

The AI chat is not just a simple chatbot. It's an **agentic system** that can:

- Call tools autonomously to fetch data
- Chain multiple tool calls to answer complex questions
- Access your portfolio holdings and performance
- Fetch real-time stock prices and market data
- Send emails via Gmail
- Send messages to Slack

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ ChatSidebar │  │ ChatInput   │  │ ChatMessages        │  │
│  │ (history)   │  │ (user msg)  │  │ (streaming display) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                           │                                  │
│                    useChat hook                              │
│                    (Vercel AI SDK)                           │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (ORPC)                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 sendMessage handler                  │    │
│  │  1. Save user message to DB                         │    │
│  │  2. Fetch Arcade tools dynamically                  │    │
│  │  3. Combine with local tools                        │    │
│  │  4. Call LLM with streamText()                      │    │
│  │  5. Stream response back                            │    │
│  │  6. Save assistant message to DB                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│              ┌────────────┴────────────┐                    │
│              ▼                         ▼                    │
│     ┌─────────────────┐      ┌─────────────────┐           │
│     │  Arcade Tools   │      │  Local Tools    │           │
│     │  - Stock data   │      │  - Portfolio    │           │
│     │  - Company info │      │  - Performance  │           │
│     │  - Gmail        │      │                 │           │
│     │  - Slack        │      │                 │           │
│     └─────────────────┘      └─────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Available Tools

The AI has access to two types of tools:

### Arcade Tools (External)

These are fetched dynamically from Arcade at runtime:

| Tool | Description |
|------|-------------|
| `GetStockPrice` | Current price, volume, daily change |
| `GetCompanyInfo` | Company fundamentals, sector, market cap |
| `GetCompanyNews` | Recent news articles |
| `GetHistoricalPrices` | Historical price data for charts |
| `Gmail_ListEmails` | Read emails from inbox/sent |
| `Gmail_SendEmail` | Send emails |
| `Slack.*` | Full Slack integration |

### Local Tools (Database)

These access the user's data directly:

| Tool | Description |
|------|-------------|
| `get_portfolio_holdings` | All holdings with purchase info |
| `get_portfolio_performance` | Current value, gain/loss metrics |

## How It Works

### 1. Message Flow

```typescript
// User sends a message
const { sendMessage } = useChat({
  transport: {
    async sendMessages({ messages }) {
      // Calls the ORPC endpoint
      const result = await client.aiChat.send({ chatId, messages });
      return eventIteratorToUnproxiedDataStream(result);
    },
  },
});
```

### 2. Tool Fetching

Tools are fetched dynamically from Arcade on each request:

```typescript
const arcadeToolsConfig = {
  mcpServers: ["FinancialMcp", "Slack"],
  individualTools: ["Gmail_ListEmails", "Gmail_SendEmail", "Gmail_WhoAmI"],
  toolLimit: 30,
};

async function getArcadeTools(userId: string) {
  // Fetch from MCP servers
  const mcpServerTools = await Promise.all(
    arcadeToolsConfig.mcpServers.map(async (serverName) => {
      const response = await arcadeClient.tools.list({
        toolkit: serverName,
        limit: arcadeToolsConfig.toolLimit,
      });
      return response.items;
    })
  );

  // Convert to Vercel AI SDK format
  return toVercelTools(toZodToolSet({ tools, client, userId }));
}
```

### 3. LLM Execution

The LLM decides which tools to call:

```typescript
const result = streamText({
  model: chat.model,
  system: systemPrompt,
  messages: modelMessages,
  tools: allTools,
  toolChoice: "auto",      // LLM decides
  stopWhen: stepCountIs(5), // Max 5 tool calls per response
});
```

### 4. Streaming Response

Responses stream back to the frontend in real-time:

```typescript
return streamToEventIterator(
  result.toUIMessageStream({ sendReasoning: true })
);
```

## Example Interactions

### Portfolio Question

**User:** "How is my portfolio doing today?"

**Agent behavior:**
1. Calls `get_portfolio_holdings` to get holdings
2. Calls `GetStockPrice` for each ticker
3. Calculates performance
4. Responds with analysis

### Stock Research

**User:** "What's happening with NVDA?"

**Agent behavior:**
1. Calls `GetStockPrice` for current data
2. Calls `GetCompanyNews` for recent news
3. Calls `GetCompanyInfo` for fundamentals
4. Synthesizes into a comprehensive answer

### Email Integration

**User:** "Send me my portfolio summary via email"

**Agent behavior:**
1. Calls `get_portfolio_performance` for data
2. Formats a summary
3. Calls `Gmail_SendEmail` to send
4. Confirms delivery

## OAuth Handling

When a tool requires authorization (Gmail, Slack), Arcade handles it automatically:

```typescript
// executeOrAuthorizeZodTool returns authorization_required if needed
const result = await tool.execute(input);

if (result.authorization_required) {
  // Frontend shows auth button
  return {
    authorization_required: true,
    authorization_response: { url: result.url }
  };
}
```

The frontend detects this and shows an authorization prompt:

```tsx
// In ChatMessages component
if (toolPart.output?.authorization_required) {
  return <AuthorizationButton url={toolPart.output.url} />;
}
```

## Message Persistence

All messages are saved to the database:

```typescript
// Save user message
await prisma.message.create({
  data: { chatId, role: "user", content: message }
});

// Save assistant message (on stream finish)
onFinish: async ({ text }) => {
  await prisma.message.create({
    data: { chatId, role: "assistant", content: text }
  });
}
```

## Model Selection

Users can switch between AI models:

```typescript
const AVAILABLE_MODELS = [
  { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  // ...
];
```

The selected model is stored per chat and used for all messages in that conversation.

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `ChatSidebar` | Lists all chats, create new chat |
| `ChatHeader` | Shows chat title, model selector |
| `ChatInput` | Text input with send button |
| `ChatMessages` | Renders messages with tool execution display |
| `ChatEmptyState` | Shown when no messages exist |

## Key Files

```
app/
├── router/
│   └── aiChat.tsx           # Backend handlers and tool definitions
├── schemas/
│   └── ai-chat.ts           # Zod schemas for validation
└── dashboard/
    └── ai-chat/
        ├── layout.tsx       # Prefetches chat list
        ├── page.tsx         # New chat landing page
        ├── [chatId]/
        │   └── page.tsx     # Chat conversation view
        └── _componenets/
            ├── chat-sidebar.tsx
            ├── chat-header.tsx
            ├── chat-input.tsx
            ├── chat-messages.tsx
            └── chat-empty-state.tsx
```

## Configuration

### Adding New Tools

To add new Arcade tools, update the config:

```typescript
const arcadeToolsConfig = {
  mcpServers: ["FinancialMcp", "Slack", "NewServer"],
  individualTools: [
    "Gmail_ListEmails",
    "Gmail_SendEmail",
    "NewTool_DoSomething",
  ],
};
```

### Modifying System Prompt

The system prompt defines the AI's behavior:

```typescript
const toolSystemPrompt = `You are a helpful assistant with access to...

When answering questions:
1. Use tools to fetch current data
2. Be specific with numbers and dates
3. ...
`;
```

## Limitations

- **Max 5 tool calls per response**: Prevents runaway loops
- **No image/file uploads**: Text-only input
- **Session-based auth**: Tools use the logged-in user's permissions
