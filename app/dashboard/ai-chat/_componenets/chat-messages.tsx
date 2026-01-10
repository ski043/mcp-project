"use client";

import type { ChatStatus, UIMessage } from "ai";
import { AlertCircle, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";

type ChatMessagesProps = {
  messages: UIMessage[];
  status: ChatStatus;
  onRegenerate: () => void;
};

export function ChatMessages({
  messages,
  status,
  onRegenerate,
}: ChatMessagesProps) {
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const isLastMessageFromAssistant =
    messages.length > 0 && messages[messages.length - 1].role === "assistant";

  return (
    <>
      {messages.map((message, messageIndex) => {
        const isLastMessage = messageIndex === messages.length - 1;
        const isStreaming = status === "streaming" && isLastMessage;

        return (
          <div key={message.id}>
            {message.parts.map((part, partIndex) => {
              if (part.type === "reasoning") {
                return (
                  <Reasoning
                    key={`${message.id}-${partIndex}`}
                    isStreaming={
                      isStreaming && partIndex === message.parts.length - 1
                    }
                  >
                    <ReasoningTrigger />
                    <ReasoningContent>{part.text}</ReasoningContent>
                  </Reasoning>
                );
              }

              if (part.type === "text") {
                return (
                  <Message
                    key={`${message.id}-${partIndex}`}
                    from={message.role}
                  >
                    <MessageContent>
                      <MessageResponse>{part.text}</MessageResponse>
                    </MessageContent>
                    {message.role === "assistant" &&
                      isLastMessage &&
                      !isStreaming && (
                        <MessageActions>
                          <MessageAction
                            tooltip="Copy"
                            onClick={() => handleCopy(part.text)}
                          >
                            <Copy className="size-3" />
                          </MessageAction>
                          <MessageAction
                            tooltip="Regenerate"
                            onClick={onRegenerate}
                          >
                            <RefreshCw className="size-3" />
                          </MessageAction>
                        </MessageActions>
                      )}
                  </Message>
                );
              }

              return null;
            })}
          </div>
        );
      })}

      {status === "submitted" && (
        <div className="flex items-center gap-2">
          <Loader />
          <span className="text-sm text-muted-foreground">Thinking...</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <AlertCircle className="size-4 text-destructive" />
          <span className="flex-1 text-sm text-destructive">
            Failed to get response
          </span>
          {isLastMessageFromAssistant && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              className="text-destructive hover:text-destructive"
            >
              <RefreshCw className="mr-1 size-3" />
              Retry
            </Button>
          )}
        </div>
      )}
    </>
  );
}
