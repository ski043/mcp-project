import { z } from "zod";
import { ORPCError, streamToEventIterator } from "@orpc/server";
import { streamText, tool, stepCountIs } from "ai";
import { Arcade } from "@arcadeai/arcadejs";
import {
  toZodToolSet,
  executeOrAuthorizeZodTool,
} from "@arcadeai/arcadejs/lib";

import prisma from "@/lib/db";
import { env } from "@/lib/env";
import { AVAILABLE_MODELS } from "@/lib/ai-models";
import {
  createChatSchema,
  updateChatSchema,
  searchChatsSchema,
  sendMessageSchema,
  uiMessageSchema,
} from "../schemas/ai-chat";

import { authorized } from "../middlewares/auth";

const arcadeClient = new Arcade({ apiKey: env.ARCADE_API_KEY });

// Configuration for which Arcade tools to use
const arcadeToolsConfig = {
  // Get all tools from these MCP servers
  mcpServers: ["FinancialMcp", "Slack"],
  // Add specific individual tools (Gmail tools, etc.)
  individualTools: [
    "Gmail_ListEmails",
    "Gmail_SendEmail",
    "Gmail_WhoAmI",
  ],
  // Maximum tools to fetch per MCP server
  toolLimit: 30,
};

// Strip null and undefined values from tool inputs
// Some LLMs send null for optional params, which can cause tool failures
function stripNullValues(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// Adapter to convert Arcade tools to Vercel AI SDK v6 format
function toVercelTools(
  arcadeTools: Record<string, unknown>
): Record<string, unknown> {
  const vercelTools: Record<string, unknown> = {};

  for (const [name, tool] of Object.entries(arcadeTools)) {
    const t = tool as {
      description: string;
      parameters: unknown;
      execute: (input: Record<string, unknown>) => Promise<unknown>;
    };
    vercelTools[name] = {
      description: t.description,
      inputSchema: t.parameters, // AI SDK v6 uses inputSchema, not parameters
      execute: async (input: Record<string, unknown>) => {
        const cleanedInput = stripNullValues(input);
        return t.execute(cleanedInput);
      },
    };
  }

  return vercelTools;
}

// Fetch and convert Arcade tools dynamically
async function getArcadeTools(userId: string) {
  // Fetch tools from MCP servers
  const mcpServerTools = await Promise.all(
    arcadeToolsConfig.mcpServers.map(async (serverName) => {
      const response = await arcadeClient.tools.list({
        toolkit: serverName,
        limit: arcadeToolsConfig.toolLimit,
      });
      return response.items;
    })
  );

  // Fetch individual tools
  const individualToolDefs = await Promise.all(
    arcadeToolsConfig.individualTools.map((toolName) =>
      arcadeClient.tools.get(toolName)
    )
  );

  // Combine and deduplicate
  const allTools = [...mcpServerTools.flat(), ...individualToolDefs];
  const uniqueTools = Array.from(
    new Map(allTools.map((tool) => [tool.qualified_name, tool])).values()
  );

  // Convert to Arcade's Zod format, then adapt for Vercel AI SDK
  const arcadeTools = toZodToolSet({
    tools: uniqueTools,
    client: arcadeClient,
    userId,
    executeFactory: executeOrAuthorizeZodTool,
  });

  return toVercelTools(arcadeTools);
}

// Create local database tools (these can't be fetched from Arcade)
const createLocalTools = (userId: string, userIdForDb: string) => ({
  get_portfolio_holdings: tool({
    description: "Get all holdings in the user's portfolio with purchase information",
    inputSchema: z.object({}),
    execute: async () => {
      const portfolio = await prisma.portfolio.findFirst({
        where: { userId: userIdForDb },
        include: { holdings: true },
      });
      return portfolio?.holdings || [];
    },
  }),

  get_portfolio_performance: tool({
    description:
      "Get portfolio performance metrics including total value, gain/loss, and current prices",
    inputSchema: z.object({}),
    execute: async () => {
      const portfolio = await prisma.portfolio.findFirst({
        where: { userId: userIdForDb },
        include: { holdings: true },
      });

      if (!portfolio || portfolio.holdings.length === 0) {
        throw new Error("No portfolio found or portfolio is empty");
      }

      // Fetch current prices for all holdings using Arcade tools
      const holdingsData = await Promise.all(
        portfolio.holdings.map(async (holding) => {
          try {
            const response = await arcadeClient.tools.execute({
              tool_name: "FinancialMcp.GetStockPrice@1.0.0",
              input: { ticker: holding.ticker },
              user_id: userId,
            });
            const priceData =
              typeof response.output?.value === "string"
                ? JSON.parse(response.output.value)
                : response.output?.value;

            const currentPrice = priceData?.price || null;
            const purchaseValue = holding.purchasePrice * holding.quantity;
            const currentValue = currentPrice
              ? currentPrice * holding.quantity
              : null;
            const gainLoss = currentValue ? currentValue - purchaseValue : null;
            const gainLossPercent = gainLoss
              ? (gainLoss / purchaseValue) * 100
              : null;

            return {
              ticker: holding.ticker,
              quantity: holding.quantity,
              purchasePrice: holding.purchasePrice,
              currentPrice,
              currentValue,
              gainLoss,
              gainLossPercent,
            };
          } catch (error) {
            console.error(
              `Failed to fetch price for ${holding.ticker}:`,
              error
            );
            return null;
          }
        })
      );

      const validHoldings = holdingsData.filter((h) => h !== null);
      const totalPurchaseValue = validHoldings.reduce(
        (sum, h) => sum + h.purchasePrice * h.quantity,
        0
      );
      const totalCurrentValue = validHoldings.reduce(
        (sum, h) => sum + (h.currentValue || 0),
        0
      );
      const totalGainLoss = totalCurrentValue - totalPurchaseValue;
      const totalGainLossPercent =
        totalPurchaseValue > 0
          ? (totalGainLoss / totalPurchaseValue) * 100
          : 0;

      return {
        totalPurchaseValue,
        totalCurrentValue,
        totalGainLoss,
        totalGainLossPercent,
        holdingsCount: validHoldings.length,
        holdings: validHoldings,
      };
    },
  }),
});

export const listChats = authorized
  .route({
    path: "/ai-chat/list",
    method: "GET",
    summary: "List user's chats",
  })
  .input(
    z.object({
      limit: z.number().int().positive().optional().default(50),
      cursor: z.uuid().optional(),
    })
  )
  .handler(async ({ context, input }) => {
    const limit = input.limit;

    const chats = await prisma.chat.findMany({
      where: { userId: context.user.id },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(input.cursor && {
        cursor: { id: input.cursor },
        skip: 1,
      }),
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let nextCursor: string | null = null;
    if (chats.length > limit) {
      const nextItem = chats.pop();
      nextCursor = nextItem!.id;
    }

    return { chats, nextCursor };
  });

export const getChat = authorized
  .route({
    path: "/ai-chat/get",
    method: "GET",
    summary: "Get chat with messages",
  })
  .input(z.object({ chatId: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    const chat = await prisma.chat.findFirst({
      where: { id: input.chatId, userId: context.user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
    }

    return { chat };
  });

export const createChat = authorized
  .route({
    path: "/ai-chat/create",
    method: "POST",
    summary: "Create new chat",
  })
  .input(createChatSchema)
  .handler(async ({ context, input }) => {
    const model = input.model ?? AVAILABLE_MODELS[0].id;
    const chat = await prisma.chat.create({
      data: {
        userId: context.user.id,
        model,
        systemPrompt: input.systemPrompt,
      },
    });

    return { chat };
  });

export const updateChat = authorized
  .route({
    path: "/ai-chat/update",
    method: "POST",
    summary: "Update chat title/model/systemPrompt",
  })
  .input(updateChatSchema)
  .handler(async ({ context, input }) => {
    const chat = await prisma.chat.findFirst({
      where: { id: input.chatId, userId: context.user.id },
    });

    if (!chat) {
      throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
    }

    const updated = await prisma.chat.update({
      where: { id: input.chatId, userId: context.user.id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.model !== undefined && { model: input.model }),
        ...(input.systemPrompt !== undefined && {
          systemPrompt: input.systemPrompt,
        }),
      },
    });

    return { chat: updated };
  });

export const deleteChat = authorized
  .route({
    path: "/ai-chat/delete",
    method: "POST",
    summary: "Delete chat",
  })
  .input(z.object({ chatId: z.string().uuid() }))
  .handler(async ({ context, input }) => {
    const chat = await prisma.chat.findFirst({
      where: { id: input.chatId, userId: context.user.id },
    });

    if (!chat) {
      throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
    }

    await prisma.chat.delete({
      where: { id: input.chatId, userId: context.user.id },
    });

    return { success: true };
  });

export const searchChats = authorized
  .route({
    path: "/ai-chat/search",
    method: "GET",
    summary: "Search chats by title/content",
  })
  .input(searchChatsSchema)
  .handler(async ({ context, input }) => {
    const chats = await prisma.chat.findMany({
      where: {
        userId: context.user.id,
        OR: [
          { title: { contains: input.query, mode: "insensitive" } },
          {
            messages: {
              some: {
                content: { contains: input.query, mode: "insensitive" },
              },
            },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        model: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { chats };
  });

export const getModels = authorized
  .route({
    path: "/ai-chat/models",
    method: "GET",
    summary: "Get available models",
  })
  .handler(async () => {
    return { models: AVAILABLE_MODELS };
  });

export const sendMessage = authorized
  .route({
    path: "/ai-chat/send",
    method: "POST",
    summary: "Stream message response",
  })
  .input(sendMessageSchema)
  .handler(async ({ context, input }) => {
    const chat = await prisma.chat.findFirst({
      where: { id: input.chatId, userId: context.user.id },
    });

    if (!chat) {
      throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
    }

    // Get the last user message to save
    const lastUserMessage = input.messages.findLast((m) => m.role === "user");
    if (lastUserMessage) {
      await prisma.message.create({
        data: {
          chatId: input.chatId,
          role: "user",
          content: lastUserMessage.content,
        },
      });

      // Auto-generate title from first message if still "New Chat"
      if (chat.title === "New Chat") {
        const title = lastUserMessage.content.slice(0, 100);
        await prisma.chat.update({
          where: { id: input.chatId },
          data: { title },
        });
      }
    }

    // User IDs for tools
    const userId = context.user.email ?? context.user.id;
    const userIdForDb = context.user.id;

    // Fetch Arcade tools dynamically and combine with local tools
    const arcadeTools = await getArcadeTools(userId);
    const localTools = createLocalTools(userId, userIdForDb);
    const allTools = { ...arcadeTools, ...localTools };

    // Enhanced system prompt when tools are available
    const toolSystemPrompt = `You are a helpful assistant with access to real-time market data, the user's portfolio, Gmail, and Slack.

You can:
- Look up current stock prices and market data
- Get company information and fundamentals
- Fetch recent news about companies
- View historical price trends
- Access the user's portfolio holdings and performance
- Read and send emails via Gmail
- Send messages and interact with Slack

When answering questions:
1. Use tools to fetch current data rather than relying on outdated information
2. Be specific with numbers and dates
3. Synthesize information from multiple sources when relevant
4. Provide context and analysis, not just raw data
5. If the user asks about "my portfolio" or "my holdings", use get_portfolio_holdings or get_portfolio_performance first

For Gmail:
- To find sent emails, use the query parameter with "in:sent"
- To find received emails, use "in:inbox" or no query

Always indicate when data is real-time vs. historical.
Do not tell users to authorize manually - just call the tool and the system will handle authorization if needed.

IMPORTANT: When calling tools, if an argument is optional, do not set it. Never pass null for optional parameters.`;

    // Convert messages to model format
    const modelMessages = input.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Add system prompt (custom or tool-enhanced)
    const systemPrompt = chat.systemPrompt || toolSystemPrompt;

    // With Vercel AI Gateway, just pass the model string directly
    // Format: "provider/model-name" (e.g., "anthropic/claude-sonnet-4-20250514")
    const result = streamText({
      model: chat.model,
      system: systemPrompt,
      messages: modelMessages,
      tools: allTools,
      toolChoice: "auto",
      stopWhen: stepCountIs(5),
      onFinish: async ({ text }) => {
        try {
          await prisma.message.create({
            data: {
              chatId: input.chatId,
              role: "assistant",
              content: text,
            },
          });
        } catch (error) {
          console.error("Failed to persist assistant message:", error);
        }
      },
    });

    return streamToEventIterator(
      result.toUIMessageStream({ sendReasoning: true })
    );
  });

export const regenerateMessage = authorized
  .route({
    path: "/ai-chat/regenerate",
    method: "POST",
    summary: "Regenerate last response",
  })
  .input(z.object({ chatId: z.uuid(), messages: z.array(uiMessageSchema) }))
  .handler(async ({ context, input }) => {
    const chat = await prisma.chat.findFirst({
      where: { id: input.chatId, userId: context.user.id },
    });

    if (!chat) {
      throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
    }

    // Delete the last assistant message from DB
    const lastAssistantMessage = await prisma.message.findFirst({
      where: { chatId: input.chatId, role: "assistant" },
      orderBy: { createdAt: "desc" },
    });

    if (lastAssistantMessage) {
      await prisma.message.delete({
        where: { id: lastAssistantMessage.id },
      });
    }

    // User IDs for tools
    const userId = context.user.email ?? context.user.id;
    const userIdForDb = context.user.id;

    // Fetch Arcade tools dynamically and combine with local tools
    const arcadeTools = await getArcadeTools(userId);
    const localTools = createLocalTools(userId, userIdForDb);
    const allTools = { ...arcadeTools, ...localTools };

    // Enhanced system prompt when tools are available
    const toolSystemPrompt = `You are a helpful assistant with access to real-time market data, the user's portfolio, Gmail, and Slack.

You can:
- Look up current stock prices and market data
- Get company information and fundamentals
- Fetch recent news about companies
- View historical price trends
- Access the user's portfolio holdings and performance
- Read and send emails via Gmail
- Send messages and interact with Slack

When answering questions:
1. Use tools to fetch current data rather than relying on outdated information
2. Be specific with numbers and dates
3. Synthesize information from multiple sources when relevant
4. Provide context and analysis, not just raw data
5. If the user asks about "my portfolio" or "my holdings", use get_portfolio_holdings or get_portfolio_performance first

For Gmail:
- To find sent emails, use the query parameter with "in:sent"
- To find received emails, use "in:inbox" or no query

Always indicate when data is real-time vs. historical.
Do not tell users to authorize manually - just call the tool and the system will handle authorization if needed.

IMPORTANT: When calling tools, if an argument is optional, do not set it. Never pass null for optional parameters.`;

    // Convert messages to model format
    const modelMessages = input.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Add system prompt (custom or tool-enhanced)
    const systemPrompt = chat.systemPrompt || toolSystemPrompt;

    // With Vercel AI Gateway, just pass the model string directly
    const result = streamText({
      model: chat.model,
      system: systemPrompt,
      messages: modelMessages,
      tools: allTools,
      toolChoice: "auto",
      stopWhen: stepCountIs(5),
      onFinish: async ({ text }) => {
        try {
          await prisma.message.create({
            data: {
              chatId: input.chatId,
              role: "assistant",
              content: text,
            },
          });
        } catch (error) {
          console.error("Failed to persist assistant message:", error);
        }
      },
    });

    return streamToEventIterator(
      result.toUIMessageStream({ sendReasoning: true })
    );
  });

// Check authorization status for a tool (used for OAuth polling)
export const checkAuthStatus = authorized
  .route({
    path: "/ai-chat/auth-status",
    method: "POST",
    summary: "Check tool authorization status",
  })
  .input(z.object({ toolName: z.string() }))
  .handler(async ({ context, input }) => {
    const userId = context.user.email ?? context.user.id;

    try {
      const authResponse = await arcadeClient.tools.authorize({
        tool_name: input.toolName,
        user_id: userId,
      });
      return { status: authResponse.status };
    } catch (error) {
      console.error("Auth status check error:", error);
      return { status: "error", error: String(error) };
    }
  });
