"use client";

import { Mail, Lightbulb, Sparkles, Code, type LucideIcon } from "lucide-react";

type PromptConfig = {
  icon: LucideIcon;
  title: string;
  prompt: string;
};

const SUGGESTED_PROMPTS: PromptConfig[] = [
  {
    icon: Mail,
    title: "Fix my email",
    prompt: "Fix the grammar and tone of my email:\n\n",
  },
  {
    icon: Lightbulb,
    title: "Explain simply",
    prompt: "Explain this concept in simple terms: ",
  },
  {
    icon: Sparkles,
    title: "Brainstorm ideas",
    prompt: "Help me brainstorm ideas for ",
  },
  {
    icon: Code,
    title: "Write code",
    prompt: "Write code that ",
  },
];

type ChatEmptyStateProps = {
  onSelectPrompt: (prompt: string) => void;
};

export function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="max-w-md space-y-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">How can I help you today?</h2>
          <p className="text-sm text-muted-foreground">
            Start a conversation or pick a suggestion below
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SUGGESTED_PROMPTS.map((item) => (
            <button
              key={item.title}
              onClick={() => onSelectPrompt(item.prompt)}
              className="flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <item.icon className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">{item.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
