import type { ProviderAdapter, StreamArgs } from "./types";
import { sseLines, parseDataLine } from "./sse";

async function* stream({ apiKey, model, system, messages, signal }: StreamArgs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`gemini ${res.status}: ${await res.text().catch(() => "")}`);
  }
  for await (const line of sseLines(res.body)) {
    const data = parseDataLine(line);
    if (!data) continue;
    try {
      const evt = JSON.parse(data);
      const text = evt?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("");
      if (text) yield text as string;
    } catch {}
  }
}

export const gemini: ProviderAdapter = {
  id: "gemini",
  label: "Google Gemini",
  defaultModel: "gemini-3-pro",
  models: ["gemini-3-pro", "gemini-3.1-pro", "gemini-2.5-flash"],
  stream,
};
