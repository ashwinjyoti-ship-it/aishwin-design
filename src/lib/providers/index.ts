import { anthropic } from "./anthropic";
import { gemini } from "./gemini";
import { moonshot, openrouter } from "./openai-compat";
import type { ProviderAdapter } from "./types";

export const PROVIDERS: Record<string, ProviderAdapter> = {
  moonshot,
  anthropic,
  gemini,
  openrouter,
};

export const PROVIDER_ORDER = ["moonshot", "anthropic", "gemini", "openrouter"] as const;

export function getProvider(id: string): ProviderAdapter | null {
  return PROVIDERS[id] ?? null;
}

export type { ProviderAdapter, StreamArgs, ChatMessage } from "./types";
