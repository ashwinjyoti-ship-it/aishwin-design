import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/env";
import { isAuthed } from "@/lib/auth";
import { id as makeId } from "@/lib/id";

export const runtime = "edge";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await db()
    .prepare("SELECT id, name, summary, body, preloaded, updated_at FROM design_systems ORDER BY preloaded DESC, name ASC")
    .all();
  return NextResponse.json({ design_systems: rows.results ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name, summary, body } = (await req.json().catch(() => ({}))) as {
    name?: string; summary?: string; body?: string;
  };
  if (!name?.trim() || !body?.trim()) return NextResponse.json({ error: "name + body required" }, { status: 400 });
  const dsid = makeId("ds");
  await db()
    .prepare("INSERT INTO design_systems (id, name, summary, body, preloaded) VALUES (?, ?, ?, ?, 0)")
    .bind(dsid, name.trim(), (summary || "").trim(), body.trim())
    .run();
  return NextResponse.json({ id: dsid });
}
