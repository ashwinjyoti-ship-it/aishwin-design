// Helpers for parsing line-delimited SSE bodies from provider APIs.

export async function* sseLines(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, idx).replace(/\r$/, "");
        buf = buf.slice(idx + 1);
        if (line.length) yield line;
      }
    }
    if (buf.length) yield buf;
  } finally {
    reader.releaseLock();
  }
}

export function parseDataLine(line: string): string | null {
  if (!line.startsWith("data:")) return null;
  return line.slice(5).trimStart();
}
