// Models available through Vercel AI Gateway
// Format: provider/model-name
export const AVAILABLE_MODELS = [
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Latest Gemini 2.5 Pro model",
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    description: "Latest Claude Sonnet 4.5 model",
  },
  {
    id: "openai/gpt-5.2",
    name: "GPT-5.2",
    description: "Latest GPT-5.2 model",
  },
  {
    id: "deepseek/deepseek-v3",
    name: "DeepSeek V3",
    description: "Latest DeepSeek V3 model",
  },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];
