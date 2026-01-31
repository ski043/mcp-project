# Reports

MCPMarshal can generate comprehensive AI-powered portfolio analysis reports. The reports feature showcases agentic behavior where the AI autonomously researches your holdings and produces actionable insights.

## Overview

Reports can be:

- **Generated on-demand** from the dashboard
- **Scheduled automatically** via weekly cron jobs
- **Published** to Gmail, Notion, or Google Docs

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Report Generation                         │
│                                                              │
│  1. User clicks "Generate Report"                           │
│                    │                                         │
│                    ▼                                         │
│  2. Create report record (status: generating)               │
│                    │                                         │
│                    ▼                                         │
│  3. Fetch Arcade tools dynamically                          │
│                    │                                         │
│                    ▼                                         │
│  4. LLM researches autonomously:                            │
│     - Gets prices for all holdings                          │
│     - Identifies significant movers                         │
│     - Fetches news for concerning positions                 │
│     - Checks fundamentals                                   │
│     - Up to 15 tool calls                                   │
│                    │                                         │
│                    ▼                                         │
│  5. LLM writes comprehensive report                         │
│                    │                                         │
│                    ▼                                         │
│  6. Save to database (status: completed)                    │
│                    │                                         │
│                    ▼                                         │
│  7. User can publish to Gmail/Notion/Docs                   │
└─────────────────────────────────────────────────────────────┘
```

## Agentic Research

Unlike traditional pipelines that fetch all data upfront, the report generator is **agentic**. The AI decides what to research based on what it discovers.

### Example Agent Behavior

Given a portfolio with AAPL (down 15%), MSFT (flat), and NVDA (up 45%):

1. **Get all prices first** to understand performance
2. **AAPL is down significantly** - fetch news, check fundamentals
3. **MSFT is flat** - move on quickly, nothing interesting
4. **NVDA is up significantly** - check if gains are sustainable
5. **Synthesize findings** into intelligent analysis

The AI spends more time researching positions that warrant attention.

### System Prompt

The system prompt guides the agent's research strategy:

```typescript
const systemPrompt = `You are an autonomous financial analyst agent.

You have access to tools to research each holding. You should:
1. First, get current prices for all holdings to calculate performance
2. Identify holdings that need deeper analysis (significant gains/losses)
3. Research company fundamentals for context
4. Check news for any holdings with notable price movements
5. Look at historical trends for concerning positions

IMPORTANT: Be intelligent about your research:
- If a stock is down significantly, investigate WHY
- If a stock is up significantly, check if gains are sustainable
- Don't waste time deeply researching stable, boring positions
- Focus your attention where it matters most`;
```

## Report Structure

Generated reports follow this format:

```markdown
## Executive Summary
2-3 sentences with key findings and overall portfolio health

## Portfolio Performance
Total value, overall gain/loss, comparison to purchase value

## Holdings Analysis
For each holding: current performance, key insights, outlook
(More detail for positions that warrant attention)

## Market Context & News
Synthesize relevant news that affects the portfolio

## Risk Assessment
Concentration risk, sector exposure, any red flags

## Recommendations
Specific, actionable advice based on research
```

## Publishing Channels

Reports can be published to external services via Arcade OAuth:

| Channel | Arcade Tool | What Happens |
|---------|-------------|--------------|
| **Email** | `Gmail.SendEmail` | HTML-formatted report sent to user's email |
| **Notion** | `Notion.CreatePage` | Creates a new Notion page with report content |
| **Google Docs** | `GoogleDocs.CreateDocumentFromText` | Creates a new Google Doc |

### OAuth Flow

When publishing, Arcade handles authorization:

```typescript
// Check if user has authorized the channel
const authResponse = await arcadeClient.tools.authorize({
  tool_name: "Gmail.SendEmail",
  user_id: userId,
});

if (authResponse.status !== "completed") {
  // Return auth URL for user to authorize
  return {
    status: "authorization_required",
    authUrl: authResponse.url,
  };
}

// User is authorized, send the report
await arcadeClient.tools.execute({
  tool_name: "Gmail.SendEmail",
  input: {
    subject: "Portfolio Report",
    body: htmlReport,
    recipient: userEmail,
    content_type: "html",
  },
  user_id: userId,
});
```

## Scheduled Reports (Cron)

Weekly reports are generated automatically via Vercel Cron.

### Configuration

In `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-reports",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

This runs every Monday at 9 AM UTC.

### Cron Flow

1. Fetch all portfolios with holdings
2. For each portfolio:
   - Fetch data for all holdings (prices, news, fundamentals)
   - Generate report with LLM
   - Save to database
   - Send email via Gmail
3. Cleanup old reports (keep last 10 per portfolio)

### Environment Variables

```env
CRON_SECRET=your-secret-key  # Verifies cron requests
```

The cron endpoint validates the secret:

```typescript
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/report/initiate` | POST | Create a new report record |
| `/report/stream` | POST | Stream the agentic report generation |
| `/report/list` | GET | List user's reports (last 10) |
| `/report/get` | GET | Get a specific report |
| `/report/delete` | POST | Delete a report |
| `/report/publish` | POST | Publish to Gmail/Notion/Docs |

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `ReportsList` | Lists all reports with status badges |
| `GenerateReportDialog` | Model selection and generation trigger |
| `ReportDetail` | Displays completed report content |
| `ReportStreaming` | Shows real-time generation progress |
| `PublishReportDialog` | Channel selection for publishing |
| `DeleteReportAlert` | Confirmation dialog for deletion |

## Report States

| Status | Description |
|--------|-------------|
| `generating` | Report is being researched and written |
| `completed` | Report is ready to view/publish |
| `failed` | Generation failed (error occurred) |

## Sentiment Analysis

After generation, reports are tagged with sentiment:

```typescript
// Analyze report content for sentiment signals
const bullishSignals = (text.match(/bullish|strong|growth|outperform|buy/g) || []).length;
const bearishSignals = (text.match(/bearish|weak|decline|underperform|sell/g) || []).length;

if (bullishSignals > bearishSignals + 2) sentiment = "bullish";
else if (bearishSignals > bullishSignals + 2) sentiment = "bearish";
else sentiment = "neutral";
```

## Key Files

```
app/
├── router/
│   └── report.tsx              # All report handlers
├── schemas/
│   └── report.ts               # Zod validation schemas
├── api/
│   └── cron/
│       └── weekly-reports/
│           └── route.ts        # Cron job handler
└── dashboard/
    └── reports/
        ├── page.tsx            # Reports list page
        ├── [reportId]/
        │   ├── page.tsx        # Individual report view
        │   └── _components/
        │       ├── report-detail.tsx
        │       └── report-streaming.tsx
        └── _components/
            ├── reports-list.tsx
            ├── generate-report-dialog.tsx
            ├── publish-report-dialog.tsx
            └── delete-report-alert.tsx
```

## Model Selection

Users can choose which AI model generates the report:

```typescript
const AVAILABLE_MODELS = [
  { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  // ...
];
```

Different models have different research styles and output quality.

## Streaming

Report generation streams to the frontend in real-time:

```typescript
const result = streamText({
  model: report.model,
  system: systemPrompt,
  prompt: userPrompt,
  tools,
  toolChoice: "auto",
  stopWhen: stepCountIs(15), // Max 15 tool calls
});

return streamToEventIterator(
  result.toUIMessageStream({ sendReasoning: true })
);
```

Users can watch the AI research and write the report live.

## Cleanup

Old reports are automatically cleaned up:

```typescript
// Keep only the last 10 reports per portfolio
const oldReports = await prisma.report.findMany({
  where: { portfolioId: portfolio.id },
  orderBy: { createdAt: "desc" },
  skip: 10,
});

if (oldReports.length > 0) {
  await prisma.report.deleteMany({
    where: { id: { in: oldReports.map((r) => r.id) } },
  });
}
```

## Limitations

- **Max 15 tool calls per report**: Prevents runaway research
- **60 second timeout for cron**: Vercel hobby plan limit
- **One report at a time**: No concurrent generation for same portfolio
- **Email requires Gmail authorization**: User must have authorized Gmail via Arcade
