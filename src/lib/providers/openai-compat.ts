import type { ProviderAdapter, StreamArgs } from "./types";
import { parseDataLine, sseLines } from "./sse";

interface CompatConfig {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
}

function adapterFrom(cfg: CompatConfig): ProviderAdapter {
  async function* stream({ apiKey, model, system, messages, signal }: StreamArgs) {
    const payload = {
      model,
      stream: true,
      max_tokens: 8192,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    };
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.body) {
      throw new Error(`${cfg.id} ${res.status}: ${await res.text().catch(() => "")}`);
    }
    for await (const line of sseLines(res.body)) {
      const data = parseDataLine(line);
      if (!data || data === "[DONE]") continue;
      try {
        const evt = JSON.parse(data);
        const delta = evt?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length) yield delta;
      } catch {}
    }
  }
  return {
    id: cfg.id,
    label: cfg.label,
    defaultModel: cfg.defaultModel,
    models: cfg.models,
    stream,
  };
}

export const moonshot = adapterFrom({
  id: "moonshot",
  label: "Moonshot Kimi",
  baseUrl: "https://api.moonshot.ai/v1",
  defaultModel: "kimi-k2-0711-preview",
  // Kimi K2.6 + the long-context turbo variants. Edit in /settings if Moonshot ships new IDs.
  models: ["kimi-k2-0711-preview", "kimi-k2-turbo-preview", "moonshot-v1-128k", "moonshot-v1-32k"],
});

export const openrouter = adapterFrom({
  id: "openrouter",
  label: "OpenRouter",
  baseUrl: "https://openrouter.ai/api/v1",
  defaultModel: "moonshotai/kimi-k2",
  models: [
    "moonshotai/kimi-k2",
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-opus-4.7",
    "google/gemini-2.5-pro",
    "deepseek/deepseek-chat",
  ],
});
