import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/env";
import { id } from "@/lib/id";
import { readSettings } from "@/lib/settings";

export const runtime = "edge";

export async function GET() {
  const rows = await db()
    .prepare("SELECT id, name, brief, skill_id, design_system_id, provider, model, updated_at FROM projects ORDER BY updated_at DESC")
    .all();
  return NextResponse.json({ projects: rows.results ?? [] });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    brief?: string;
    skill_id?: string;
    design_system_id?: string;
    provider?: string;
    model?: string;
  };
  const settings = await readSettings();
  const pid = id("proj");
  await db()
    .prepare("INSERT INTO projects (id, name, brief, skill_id, design_system_id, provider, model) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(
      pid,
      body.name?.trim() || "Untitled",
      body.brief?.trim() || null,
      body.skill_id || null,
      body.design_system_id || null,
      body.provider || settings.defaultProvider,
      body.model || settings.defaultModel,
    )
    .run();
  return NextResponse.json({ id: pid });
}
