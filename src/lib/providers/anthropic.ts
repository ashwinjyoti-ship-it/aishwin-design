import type { ProviderAdapter, StreamArgs } from "./types";
import { parseDataLine, sseLines } from "./sse";

async function* stream({ apiKey, model, system, messages, signal }: StreamArgs) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system,
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`anthropic ${res.status}: ${await res.text().catch(() => "")}`);
  }
  for await (const line of sseLines(res.body)) {
    const data = parseDataLine(line);
    if (!data) continue;
    try {
      const evt = JSON.parse(data);
      if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
        yield evt.delta.text as string;
      }
    } catch {}
  }
}

export const anthropic: ProviderAdapter = {
  id: "anthropic",
  label: "Anthropic",
  defaultModel: "claude-opus-4.7",
  models: ["claude-opus-4.7", "claude-sonnet-4.5", "claude-haiku"],
  stream,
};
