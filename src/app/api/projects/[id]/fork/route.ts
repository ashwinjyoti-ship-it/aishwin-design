import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/env";
import { isAuthed } from "@/lib/auth";
import { id as makeId } from "@/lib/id";

export const runtime = "edge";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id: sourceId } = await params;

  const source = await db()
    .prepare("SELECT * FROM projects WHERE id = ?")
    .bind(sourceId)
    .first<{
      id: string; name: string; brief: string | null;
      skill_id: string | null; design_system_id: string | null;
      provider: string; model: string;
    }>();
  if (!source) return NextResponse.json({ error: "not found" }, { status: 404 });

  const newId = makeId("proj");
  await db()
    .prepare("INSERT INTO projects (id, name, brief, skill_id, design_system_id, provider, model) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(
      newId,
      `${source.name} (copy)`,
      source.brief,
      source.skill_id,
      source.design_system_id,
      source.provider,
      source.model,
    )
    .run();

  const memRows = await db()
    .prepare("SELECT body, pinned FROM memory WHERE project_id = ?")
    .bind(sourceId)
    .all<{ body: string; pinned: number }>();

  for (const row of memRows.results ?? []) {
    const memId = makeId("mem");
    await db()
      .prepare("INSERT INTO memory (id, project_id, body, pinned) VALUES (?, ?, ?, ?)")
      .bind(memId, newId, row.body, row.pinned)
      .run();
  }

  return NextResponse.json({ id: newId });
}
