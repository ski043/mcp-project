# From Pipeline to Agent: The Evolution of Report Generation

This document explains the architectural transformation from a traditional data pipeline to a truly agentic system.

## The Problem with Pipelines

Traditional AI applications follow a predictable pattern:

```
Fetch ALL data → Pass to LLM → Get summary
```

This approach has limitations:
- **Wasteful**: Fetches data that may not be relevant
- **Unintelligent**: Treats all holdings equally regardless of significance
- **Brittle**: Fixed sequence that can't adapt to findings
- **Not truly "AI"**: The LLM just summarizes—it doesn't think

## Pipeline Approach (Before)

```typescript
// The code decided what to fetch—not the AI
const holdingsData = await Promise.all(
  portfolio.holdings.map(async (holding) => {
    // Always fetch everything for every holding
    const [priceRes, companyRes, newsRes, histRes] = await Promise.all([
      arcadeClient.tools.execute({ tool_name: "GetStockPrice", input: { ticker } }),
      arcadeClient.tools.execute({ tool_name: "GetCompanyInfo", input: { ticker } }),
      arcadeClient.tools.execute({ tool_name: "GetCompanyNews", input: { ticker } }),
      arcadeClient.tools.execute({ tool_name: "GetHistoricalPrices", input: { ticker } }),
    ]);
    return { ...priceRes, ...companyRes, ...newsRes, ...histRes };
  })
);

// LLM just summarizes pre-fetched data
const result = await generateText({
  model: "claude-sonnet",
  prompt: `Summarize this data: ${JSON.stringify(holdingsData)}`,
});
```

**What happens:**
1. Code fetches price, company info, news, and history for ALL holdings
2. Same data fetched whether stock is up 50% or flat
3. LLM receives a data dump and summarizes it
4. No reasoning about what's important

## Agentic Approach (After)

```typescript
// Give the LLM tools and let IT decide what to research
const tools = {
  get_stock_price: tool({
    description: "Get current stock price...",
    execute: async ({ ticker }) => { /* ... */ },
  }),
  get_company_info: tool({ /* ... */ }),
  get_company_news: tool({ /* ... */ }),
  get_historical_prices: tool({ /* ... */ }),
};

const result = streamText({
  model: "claude-sonnet",
  system: `You are an autonomous financial analyst. Research the portfolio
           and generate insights. Focus on holdings that warrant attention.`,
  prompt: `Analyze: AAPL (10 shares @ $150), MSFT (5 shares @ $380)...`,
  tools,
  toolChoice: "auto",      // LLM decides which tools to call
  stopWhen: stepCountIs(15), // Allow multi-step reasoning
});
```

**What happens:**
1. LLM receives holdings list and available tools
2. LLM decides: "Let me check prices first..."
3. LLM sees AAPL is down 15%: "That's significant, let me check the news..."
4. LLM sees MSFT is flat: "Nothing interesting, moving on..."
5. LLM synthesizes findings into intelligent analysis

## The Key Difference

| Aspect | Pipeline | Agent |
|--------|----------|-------|
| **Who decides what data to fetch?** | Code (predetermined) | LLM (autonomous) |
| **Adapts to findings?** | No | Yes |
| **Resource efficiency** | Wastes API calls | Fetches what's needed |
| **Output quality** | Generic, equal coverage | Focused on what matters |
| **Multi-step reasoning** | No | Yes (up to 15 steps) |

## Real Example

**Portfolio:** AAPL (down 15%), MSFT (up 2%), NVDA (up 45%)

### Pipeline Output
> "AAPL is at $170, down from $200. MSFT is at $410, up from $402. NVDA is at $890, up from $614. Your portfolio has mixed performance..."

*Generic. Treats 2% and 45% gains the same way.*

### Agent Output
> "**Alert: AAPL requires attention.** Down 15% amid reports of iPhone sales weakness in China (Reuters, Jan 15). The company's forward P/E remains elevated at 28x despite slowing growth.
>
> **NVDA is your star performer** at +45%, driven by continued AI chip demand. However, the stock now trades at 65x earnings—consider taking partial profits.
>
> MSFT remains stable (+2%), performing in line with the broader market.
>
> **Recommendation:** Review AAPL position given fundamental concerns. Consider rebalancing NVDA gains into more defensive positions."

*Intelligent. Focused on what matters. Cites specific news. Gives actionable advice.*

## Implementation Details

### Tool Definition

```typescript
const tools = {
  get_stock_price: tool({
    description: "Get current stock price, volume, and daily change for a ticker.",
    inputSchema: z.object({
      ticker: z.string().describe("Stock ticker symbol (e.g., AAPL)"),
    }),
    execute: async ({ ticker }) => {
      const response = await arcadeClient.tools.execute({
        tool_name: "FinancialMcp.GetStockPrice@1.0.0",
        input: { ticker },
        user_id: userId,
      });
      return response.output?.value;
    },
  }),
  // ... more tools
};
```

### Agentic Prompt

The system prompt is crucial—it tells the LLM HOW to be an agent:

```typescript
const systemPrompt = `You are an autonomous financial analyst agent.

You have access to tools to research each holding. You should:
1. First, get current prices for all holdings to calculate performance
2. Identify holdings that need deeper analysis (significant gains/losses)
3. Research company fundamentals for context
4. Check news for any holdings with notable price movements
5. Look at historical trends for concerning positions

IMPORTANT: Be intelligent about your research:
- If a stock is down significantly, investigate WHY (check news, fundamentals)
- If a stock is up significantly, check if the gains are sustainable
- Don't waste time deeply researching stable, boring positions
- Focus your attention where it matters most`;
```

### Multi-Step Execution

```typescript
const result = streamText({
  model: report.model,
  system: systemPrompt,
  prompt: userPrompt,
  tools,
  toolChoice: "auto",
  stopWhen: stepCountIs(15), // Allow up to 15 tool calls
});
```

The `stopWhen: stepCountIs(15)` allows the agent to:
1. Call `get_stock_price` for AAPL → sees -15%
2. Call `get_company_news` for AAPL → finds concerning headlines
3. Call `get_company_info` for AAPL → checks fundamentals
4. Call `get_stock_price` for MSFT → sees +2%, moves on quickly
5. Call `get_stock_price` for NVDA → sees +45%
6. Call `get_company_news` for NVDA → checks if gains are justified
7. ... continues until satisfied or hits 15 steps
8. Writes comprehensive report

## Why This Matters

### For Users
- More relevant insights
- Actionable recommendations
- Analysis that adapts to their specific situation

### For Developers
- Demonstrates true AI agent capabilities
- Showcases Arcade's tool execution
- Production-ready pattern for agentic applications

### For the Video
This transformation is the perfect story:
1. "Here's how most AI apps work—data pipeline to LLM"
2. "But that's not really intelligence..."
3. "Watch what happens when we give the LLM agency"
4. "It decides what to research based on what it finds"
5. "This is what Arcade enables—real AI agents with real tools"

## Files Changed

| File | Change |
|------|--------|
| `app/router/report.tsx` | Added `createReportTools()`, rewrote `streamReport` to use agentic loop |
| `README.md` | Updated to reflect agentic capabilities |

## Conclusion

The shift from pipeline to agent isn't just a code change—it's a paradigm shift. Instead of treating the LLM as a summarization engine, we're treating it as an autonomous researcher that can:

- **Observe**: Get initial data
- **Orient**: Identify what's interesting
- **Decide**: Choose what to investigate further
- **Act**: Fetch more data, then synthesize

This is what separates a "GPT wrapper" from a true AI agent.
