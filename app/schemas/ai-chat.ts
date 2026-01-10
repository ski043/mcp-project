import { AVAILABLE_MODELS } from "@/lib/ai-models";
import { z } from "zod";

export const modelIdSchema = z.enum(
  AVAILABLE_MODELS.map((m) => m.id) as [string, ...string[]]
);

export const chatIdSchema = z.object({
  chatId: z.uuid(),
});

export const createChatSchema = z.object({
  model: modelIdSchema.optional(),
  systemPrompt: z.string().max(10000).optional(),
});

export const updateChatSchema = z.object({
  chatId: z.uuid(),
  title: z.string().min(1).max(200).optional(),
  model: modelIdSchema.optional(),
  systemPrompt: z.string().max(10000).optional().nullable(),
});

export const searchChatsSchema = z.object({
  query: z.string().min(1).max(100),
});

export const uiMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.date().optional(),
});

export const sendMessageSchema = z.object({
  chatId: z.uuid(),
  messages: z.array(uiMessageSchema),
});

export const messageSchema = z.object({
  id: z.uuid(),
  chatId: z.uuid(),
  role: z.string(),
  content: z.string(),
  createdAt: z.date(),
});

export const chatSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  title: z.string(),
  systemPrompt: z.string().nullable(),
  model: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  messages: z.array(messageSchema).optional(),
});
