"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import { Loader2 } from "lucide-react";

import { client, orpc } from "@/lib/orpc";
import { Card, CardContent } from "@/components/ui/card";
import { MessageResponse } from "@/components/ai-elements/message";

type ReportStreamingProps = {
  reportId: string;
};

export function ReportStreaming({ reportId }: ReportStreamingProps) {
  const queryClient = useQueryClient();
  const hasStarted = useRef(false);

  const { messages, sendMessage, status } = useChat({
    id: `report-${reportId}`,
    transport: {
      async sendMessages(options) {
        const result = await client.report.stream(
          { reportId },
          { signal: options.abortSignal }
        );
        return eventIteratorToUnproxiedDataStream(result);
      },
      reconnectToStream() {
        throw new Error("Unsupported");
      },
    },
    onFinish() {
      // Invalidate report query to refetch with completed status
      queryClient.invalidateQueries({
        queryKey: orpc.report.get.key({ input: { reportId } }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.report.list.key(),
      });
    },
  });

  // Auto-start streaming on mount
  useEffect(() => {
    if (!hasStarted.current && status === "ready") {
      hasStarted.current = true;
      // Send a trigger message to start the stream
      sendMessage({ text: "generate" });
    }
  }, [status, sendMessage]);

  const isStreaming = status === "streaming" || status === "submitted";
  const latestAssistantMessage = messages.findLast((m) => m.role === "assistant");

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {latestAssistantMessage ? (
            <MessageResponse parseIncompleteMarkdown={isStreaming}>
              {latestAssistantMessage.parts
                .filter((part) => part.type === "text")
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("")}
            </MessageResponse>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground not-prose">
              <Loader2 className="animate-spin size-4" />
              Starting analysis...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
