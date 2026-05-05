import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { setSessionCookie } from "@/lib/auth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = env().APP_PASSWORD;
  if (!expected) return NextResponse.json({ error: "APP_PASSWORD not configured" }, { status: 500 });
  if (!password || password !== expected) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }
  await setSessionCookie();
  return NextResponse.json({ ok: true });
}
