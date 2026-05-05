import { NextRequest } from "next/server";
import { db } from "@/lib/env";
import { isAuthed } from "@/lib/auth";

export const runtime = "edge";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return new Response("unauthorized", { status: 401 });
  const { id } = await params;
  const row = await db().prepare("SELECT body, kind FROM artifacts WHERE id = ?").bind(id).first<{ body: string; kind: string }>();
  if (!row) return new Response("not found", { status: 404 });
  const type = row.kind === "html" ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
  return new Response(row.body, {
    headers: {
      "content-type": type,
      // Sandbox the iframe via CSP. No outbound assets except inline.
      "content-security-policy":
        "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      "x-frame-options": "SAMEORIGIN",
    },
  });
}
