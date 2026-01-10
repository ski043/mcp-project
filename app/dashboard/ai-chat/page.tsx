"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Bot } from "lucide-react";

export default function AIChatPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createChatMutation = useMutation(
    orpc.aiChat.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: orpc.aiChat.list.key() });
        router.push(`/dashboard/ai-chat/${data.chat.id}`);
      },
    })
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="size-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">AI Chat Assistant</h1>
          <p className="text-muted-foreground">
            Start a conversation with AI to get help with your questions
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => createChatMutation.mutate({})}
          disabled={createChatMutation.isPending}
        >
          <MessageSquare className="size-4" />
          Start new chat
        </Button>

        <div className="grid grid-cols-3 gap-4 pt-8">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <Bot className="size-5 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">Multiple AI models</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <Sparkles className="size-5 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">Custom prompts</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <History className="size-5 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">Chat history</p>
          </div>
        </div>
      </div>
    </div>
  );
}
