import { anthropic } from "./anthropic";
import { gemini } from "./gemini";
import { openai, moonshot, openrouter } from "./openai-compat";
import type { ProviderAdapter } from "./types";

export const PROVIDERS: Record<string, ProviderAdapter> = {
  openai,
  anthropic,
  gemini,
  moonshot,
  openrouter,
};

export const PROVIDER_ORDER = ["openai", "anthropic", "gemini", "moonshot", "openrouter"] as const;

export function getProvider(id: string): ProviderAdapter | null {
  return PROVIDERS[id] ?? null;
}

export type { ProviderAdapter, StreamArgs, ChatMessage } from "./types";
