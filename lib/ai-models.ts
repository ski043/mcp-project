// Models available through Vercel AI Gateway
// Format: provider/model-name
export const AVAILABLE_MODELS = [
  {
    id: "anthropic/claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    description: "Latest Claude 4 Sonnet model",
  },
  {
    id: "anthropic/claude-3-5-haiku-latest",
    name: "Claude 3.5 Haiku",
    description: "Fast and affordable",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "OpenAI's flagship model",
  },
  {
    id: "deepseek/deepseek-v3.2-thinking",
    name: "DeepSeek V3.2 Thinking",
    description: "128K context, reasoning model",
  },
  {
    id: "zai/glm-4.6",
    name: "GLM-4.6",
    description: "Zhipu AI's latest model",
  },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];
