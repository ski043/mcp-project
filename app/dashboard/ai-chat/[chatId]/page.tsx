"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { client, orpc } from "@/lib/orpc";
import { ChatHeader } from "../_componenets/chat-header";
import { ChatMessages } from "../_componenets/chat-messages";
import { ChatEmptyState } from "../_componenets/chat-empty-state";
import { ChatInput } from "../_componenets/chat-input";

type DbMessage = {
  id: string;
  chatId: string;
  role: string;
  content: string;
  createdAt: Date;
};

function convertDbMessagesToUIMessages(dbMessages: DbMessage[]): UIMessage[] {
  return dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: msg.content }],
    createdAt: msg.createdAt,
  }));
}

export default function ChatPageClient() {
  const params = useParams();
  const chatId = params.chatId as string;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    orpc.aiChat.get.queryOptions({ input: { chatId } })
  );
  const chat = data?.chat;

  const [input, setInput] = useState("");
  const [modelOverride, setModelOverride] = useState<string | null>(null);

  const selectedModel = modelOverride ?? chat?.model ?? "";

  const updateModelMutation = useMutation(orpc.aiChat.update.mutationOptions());

  const { messages, status, stop, regenerate, sendMessage, setMessages } =
    useChat({
      id: chatId,
      messages: chat?.messages
        ? convertDbMessagesToUIMessages(chat.messages)
        : [],
      transport: {
        async sendMessages({ messages, abortSignal, trigger }) {
          const apiMessages = messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.parts
              .filter(
                (p): p is { type: "text"; text: string } => p.type === "text"
              )
              .map((p) => p.text)
              .join(""),
          }));

          // Use the appropriate endpoint based on trigger
          const result =
            trigger === "regenerate-message"
              ? await client.aiChat.regenerate(
                  {
                    chatId,
                    messages: apiMessages,
                  },
                  { signal: abortSignal }
                )
              : await client.aiChat.send(
                  {
                    chatId,
                    messages: apiMessages,
                  },
                  { signal: abortSignal }
                );

          return eventIteratorToUnproxiedDataStream(result);
        },
        reconnectToStream() {
          throw new Error("Reconnect not supported");
        },
      },
      onFinish: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.aiChat.list.key(),
        });
      },
      onError: (error) => {
        toast.error("Failed to send message", {
          description: error.message,
        });
      },
    });

  useEffect(() => {
    if (chat?.messages) {
      setMessages(convertDbMessagesToUIMessages(chat.messages));
    }
  }, [chat?.messages, setMessages]);

  const handleModelChange = useCallback(
    (newModel: string) => {
      setModelOverride(newModel);
      updateModelMutation.mutate({ chatId, model: newModel });
    },
    [chatId, updateModelMutation]
  );

  const handleSelectPrompt = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  const handleSubmit = useCallback(
    (message: { text: string; files: unknown[] }) => {
      if (!message.text.trim()) return;

      setInput("");
      sendMessage({ text: message.text });
    },
    [sendMessage]
  );

  const handleRegenerate = useCallback(() => {
    regenerate();
  }, [regenerate]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-sm text-destructive">
          {error?.message || "Chat not found"}
        </p>
      </div>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full min-w-0 flex-col">
      <ChatHeader title={chat.title} />

      <Conversation className="flex-1">
        <ConversationContent>
          {hasMessages ? (
            <ChatMessages
              messages={messages}
              status={status}
              onRegenerate={handleRegenerate}
            />
          ) : (
            <ChatEmptyState onSelectPrompt={handleSelectPrompt} />
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        status={status}
        onStop={stop}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />
    </div>
  );
}
