import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/env";
import { isAuthed } from "@/lib/auth";

export const runtime = "edge";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed(_req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const skill = await db().prepare("SELECT * FROM skills WHERE id = ?").bind(id).first();
  if (!skill) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ skill });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { name, summary, body } = (await req.json().catch(() => ({}))) as {
    name?: string; summary?: string; body?: string;
  };
  await db()
    .prepare("UPDATE skills SET name = COALESCE(?, name), summary = COALESCE(?, summary), body = COALESCE(?, body), updated_at = unixepoch() WHERE id = ?")
    .bind(name ?? null, summary ?? null, body ?? null, id)
    .run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed(_req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  // Preloaded skills are kept; user can edit but not delete.
  const row = await db().prepare("SELECT preloaded FROM skills WHERE id = ?").bind(id).first<{ preloaded: number }>();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.preloaded) return NextResponse.json({ error: "cannot delete preloaded skill" }, { status: 400 });
  await db().prepare("DELETE FROM skills WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
