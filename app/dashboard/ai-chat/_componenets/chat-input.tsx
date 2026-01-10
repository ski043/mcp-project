"use client";

import type { ChatStatus } from "ai";
import type { KeyboardEvent } from "react";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { AVAILABLE_MODELS } from "@/lib/ai-models";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
  status: ChatStatus;
  onStop: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
};

export function ChatInput({
  value,
  onChange,
  onSubmit,
  status,
  onStop,
  selectedModel,
  onModelChange,
}: ChatInputProps) {
  const isLoading = status === "streaming" || status === "submitted";

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form && !isLoading) {
        form.requestSubmit();
      }
    }
  };

  const handleSubmitClick = () => {
    if (status === "streaming") {
      onStop();
    }
  };

  return (
    <div className="shrink-0 border-t p-4">
      <PromptInput onSubmit={onSubmit}>
        <PromptInputBody>
          <PromptInputTextarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputSelect
              value={selectedModel}
              onValueChange={onModelChange}
            >
              <PromptInputSelectTrigger className="w-auto min-w-[140px]">
                <PromptInputSelectValue />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <PromptInputSelectItem key={model.id} value={model.id}>
                    {model.name}
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
          </PromptInputTools>
          <PromptInputSubmit
            status={status}
            onClick={handleSubmitClick}
            disabled={!value.trim() && status === "ready"}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
