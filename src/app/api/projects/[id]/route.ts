import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/env";
import { isAuthed } from "@/lib/auth";

export const runtime = "edge";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: pid } = await params;
  const project = await db()
    .prepare("SELECT * FROM projects WHERE id = ?")
    .bind(pid)
    .first();
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  const messages = await db()
    .prepare("SELECT id, role, content, artifact_key, created_at FROM messages WHERE project_id = ? ORDER BY created_at ASC")
    .bind(pid)
    .all();
  const memory = await db()
    .prepare("SELECT id, body, pinned, updated_at FROM memory WHERE project_id = ? ORDER BY pinned DESC, updated_at DESC")
    .bind(pid)
    .all();
  const artifacts = await db()
    .prepare("SELECT id, message_id, kind, created_at FROM artifacts WHERE project_id = ? ORDER BY created_at DESC LIMIT 20")
    .bind(pid)
    .all();
  return NextResponse.json({
    project,
    messages: messages.results ?? [],
    memory: memory.results ?? [],
    artifacts: artifacts.results ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: pid } = await params;
  const body = (await req.json().catch(() => ({}))) as Partial<{
    name: string;
    brief: string;
    skill_id: string | null;
    design_system_id: string | null;
    provider: string;
    model: string;
  }>;
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [k, v] of Object.entries(body)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  if (!fields.length) return NextResponse.json({ ok: true });
  fields.push("updated_at = unixepoch()");
  values.push(pid);
  await db()
    .prepare(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: pid } = await params;
  await db().prepare("DELETE FROM projects WHERE id = ?").bind(pid).run();
  return NextResponse.json({ ok: true });
}
