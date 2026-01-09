import { z } from "zod";
import { ORPCError, streamToEventIterator } from "@orpc/server";
import { streamText } from "ai";

import prisma from "@/lib/db";
import { AVAILABLE_MODELS } from "@/lib/ai-models";
import {
  createChatSchema,
  updateChatSchema,
  searchChatsSchema,
  sendMessageSchema,
} from "../schemas/ai-chat";
import {
  captureServerEvent,
  ServerAnalyticsEvents,
} from "@/lib/analytics.server";
import { authorized } from "../middlewares/auth";

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
    const model = input.model ?? "anthropic/claude-sonnet-4-20250514";
    const chat = await prisma.chat.create({
      data: {
        userId: context.user.id,
        model,
        systemPrompt: input.systemPrompt,
      },
    });

    // Track chat creation
    void captureServerEvent(
      context.user.email,
      ServerAnalyticsEvents.CHAT_CREATED,
      { model }
    );

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
      where: { id: input.chatId },
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
      where: { id: input.chatId },
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

    // Convert to model messages format for AI SDK v5
    const modelMessages = input.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Add system prompt if exists
    const allMessages = chat.systemPrompt
      ? [
          { role: "system" as const, content: chat.systemPrompt },
          ...modelMessages,
        ]
      : modelMessages;

    // With Vercel AI Gateway, just pass the model string directly
    // Format: "provider/model-name" (e.g., "anthropic/claude-sonnet-4-20250514")
    const result = streamText({
      model: chat.model,
      messages: allMessages,
      onFinish: async ({ text }) => {
        await prisma.message.create({
          data: {
            chatId: input.chatId,
            role: "assistant",
            content: text,
          },
        });
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
  .input(z.object({ chatId: z.string().uuid(), messages: z.array(z.any()) }))
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

    // Convert to model messages format for AI SDK v5
    const modelMessages = input.messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })
    );

    // Add system prompt if exists
    const allMessages = chat.systemPrompt
      ? [
          { role: "system" as const, content: chat.systemPrompt },
          ...modelMessages,
        ]
      : modelMessages;

    // With Vercel AI Gateway, just pass the model string directly
    const result = streamText({
      model: chat.model,
      messages: allMessages,
      onFinish: async ({ text }) => {
        await prisma.message.create({
          data: {
            chatId: input.chatId,
            role: "assistant",
            content: text,
          },
        });
      },
    });

    return streamToEventIterator(
      result.toUIMessageStream({ sendReasoning: true })
    );
  });
