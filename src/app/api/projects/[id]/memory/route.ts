import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/env";
import { isAuthed } from "@/lib/auth";
import { id as makeId } from "@/lib/id";

export const runtime = "edge";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: pid } = await params;
  const { body, pinned } = (await req.json().catch(() => ({}))) as { body?: string; pinned?: boolean };
  if (!body?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });
  const mid = makeId("mem");
  await db()
    .prepare("INSERT INTO memory (id, project_id, body, pinned) VALUES (?, ?, ?, ?)")
    .bind(mid, pid, body.trim(), pinned ? 1 : 0)
    .run();
  return NextResponse.json({ id: mid });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: pid } = await params;
  const { mid } = (await req.json().catch(() => ({}))) as { mid?: string };
  if (!mid) return NextResponse.json({ error: "missing mid" }, { status: 400 });
  await db().prepare("DELETE FROM memory WHERE id = ? AND project_id = ?").bind(mid, pid).run();
  return NextResponse.json({ ok: true });
}
