export type ChatRole = "user" | "assistant" | "system";
export interface ChatMessage { role: ChatRole; content: string }

export interface StreamArgs {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}

export interface ProviderAdapter {
  id: string;
  label: string;
  defaultModel: string;
  models: string[];
  stream(args: StreamArgs): AsyncIterable<string>;
}
