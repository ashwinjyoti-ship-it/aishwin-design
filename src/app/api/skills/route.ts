import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/env";
import { isAuthed } from "@/lib/auth";
import { id as makeId } from "@/lib/id";

export const runtime = "edge";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await db()
    .prepare("SELECT id, name, summary, preloaded, updated_at FROM skills ORDER BY preloaded DESC, name ASC")
    .all();
  return NextResponse.json({ skills: rows.results ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name, summary, body } = (await req.json().catch(() => ({}))) as {
    name?: string; summary?: string; body?: string;
  };
  if (!name?.trim() || !body?.trim()) return NextResponse.json({ error: "name + body required" }, { status: 400 });
  const sid = makeId("skl");
  await db()
    .prepare("INSERT INTO skills (id, name, summary, body, preloaded) VALUES (?, ?, ?, ?, 0)")
    .bind(sid, name.trim(), (summary || "").trim(), body.trim())
    .run();
  return NextResponse.json({ id: sid });
}
