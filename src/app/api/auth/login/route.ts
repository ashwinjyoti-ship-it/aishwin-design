import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { setSessionCookie } from "@/lib/auth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = env().APP_PASSWORD;
  // If APP_PASSWORD is not configured, allow any login (no-password mode).
  if (expected && password !== expected) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }
  await setSessionCookie();
  return NextResponse.json({ ok: true });
}
