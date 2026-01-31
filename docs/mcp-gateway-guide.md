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
