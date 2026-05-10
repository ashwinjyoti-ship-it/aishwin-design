import { NextRequest } from "next/server";
import { db } from "@/lib/env";
import { id as makeId } from "@/lib/id";
import { sha256 } from "@/lib/hash";
import { kvGet, kvPut } from "@/lib/kv";
import { r2Get, r2Key, r2Put } from "@/lib/r2";
import { readSettings } from "@/lib/settings";

export const runtime = "edge";

// GET /api/projects/[id]/images?prompt=...
// Called by the sandboxed iframe when it loads an <img> tag pointing here.
// Checks KV cache → R2 → generates via OpenAI → stores → returns image bytes.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: pid } = await params;
  const prompt = req.nextUrl.searchParams.get("prompt") ?? "";
  if (!prompt.trim()) return new Response("prompt required", { status: 400 });

  const hash = await sha256(`${pid}:${prompt}`);

  // 1. Check KV for R2 key
  const cachedKey = await kvGet(`img:${hash}`);
  if (cachedKey) {
    const obj = await r2Get(cachedKey);
    if (obj) {
      return new Response(obj.body, {
        headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" },
      });
    }
  }

  // 2. Check D1 for existing record
  const existing = await db()
    .prepare("SELECT r2_key FROM generated_images WHERE prompt_hash = ? LIMIT 1")
    .bind(hash)
    .first<{ r2_key: string }>();
  if (existing) {
    const obj = await r2Get(existing.r2_key);
    if (obj) {
      await kvPut(`img:${hash}`, existing.r2_key);
      return new Response(obj.body, {
        headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" },
      });
    }
  }

  // 3. Generate via OpenAI images API
  const settings = await readSettings();
  const openaiKey = settings.keys.openai;
  if (!openaiKey) {
    return new Response("No OpenAI key set for image generation. Add one in Settings.", { status: 400 });
  }

  const genRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: "gpt-image-1", prompt, n: 1, size: "1024x1024", response_format: "b64_json" }),
  });
  if (!genRes.ok) {
    const err = await genRes.text().catch(() => "");
    return new Response(`image generation failed: ${err}`, { status: 502 });
  }
  const genJson = await genRes.json() as { data: { b64_json: string }[] };
  const b64 = genJson.data[0]?.b64_json;
  if (!b64) return new Response("no image returned", { status: 502 });

  const imgBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const imgId = makeId("img");
  const key = r2Key("image", imgId);
  await r2Put(key, imgBytes, "image/png");

  await db()
    .prepare("INSERT OR IGNORE INTO generated_images (id, project_id, prompt_hash, prompt, r2_key, width, height) VALUES (?, ?, ?, ?, ?, 1024, 1024)")
    .bind(imgId, pid, hash, prompt, key)
    .run();

  await kvPut(`img:${hash}`, key);

  return new Response(imgBytes, {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" },
  });
}
