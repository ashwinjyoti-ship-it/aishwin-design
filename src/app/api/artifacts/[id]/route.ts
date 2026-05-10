import { NextRequest } from "next/server";
import { db } from "@/lib/env";
import { isAuthed } from "@/lib/auth";
import { r2Get } from "@/lib/r2";

export const runtime = "edge";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed(_req))) return new Response("unauthorized", { status: 401 });
  const { id } = await params;
  const row = await db()
    .prepare("SELECT r2_key, body_inline, kind FROM artifacts WHERE id = ?")
    .bind(id)
    .first<{ r2_key: string | null; body_inline: string | null; kind: string }>();
  if (!row) return new Response("not found", { status: 404 });

  let body: string | Uint8Array | null = null;

  // Prefer R2 (large bodies)
  if (row.r2_key) {
    const obj = await r2Get(row.r2_key);
    if (obj) body = await obj.text();
  }

  // Fallback: inline body stored in D1
  if (!body && row.body_inline) body = row.body_inline;
  if (!body) return new Response("artifact body missing", { status: 404 });

  const type = row.kind === "html" ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
  return new Response(body, {
    headers: {
      "content-type": type,
      "content-security-policy":
        "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; font-src data:; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      "x-frame-options": "SAMEORIGIN",
      "cache-control": "private, max-age=3600",
    },
  });
}
