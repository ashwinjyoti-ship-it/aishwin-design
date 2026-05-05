import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/env";
import { isAuthed } from "@/lib/auth";

export const runtime = "edge";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const ds = await db().prepare("SELECT * FROM design_systems WHERE id = ?").bind(id).first();
  if (!ds) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ design_system: ds });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { name, summary, body } = (await req.json().catch(() => ({}))) as {
    name?: string; summary?: string; body?: string;
  };
  await db()
    .prepare(
      "UPDATE design_systems SET name = COALESCE(?, name), summary = COALESCE(?, summary), body = COALESCE(?, body), updated_at = unixepoch() WHERE id = ?",
    )
    .bind(name ?? null, summary ?? null, body ?? null, id)
    .run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await db().prepare("SELECT preloaded FROM design_systems WHERE id = ?").bind(id).first<{ preloaded: number }>();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.preloaded) return NextResponse.json({ error: "cannot delete preloaded design system" }, { status: 400 });
  await db().prepare("DELETE FROM design_systems WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
