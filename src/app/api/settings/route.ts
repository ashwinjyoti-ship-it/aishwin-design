import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { publicSettings, readSettings, writeSettings } from "@/lib/settings";
import { PROVIDER_ORDER, PROVIDERS } from "@/lib/providers";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const s = await readSettings();
  return NextResponse.json({
    settings: publicSettings(s),
    providers: PROVIDER_ORDER.map((p) => ({
      id: p,
      label: PROVIDERS[p].label,
      defaultModel: PROVIDERS[p].defaultModel,
      models: PROVIDERS[p].models,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    defaultProvider?: string;
    defaultModel?: string;
    keys?: Partial<Record<string, string | null>>;
  };
  const current = await readSettings();
  const next = {
    ...current,
    defaultProvider: body.defaultProvider || current.defaultProvider,
    defaultModel: body.defaultModel || current.defaultModel,
    keys: { ...current.keys },
  };
  if (body.keys) {
    for (const [k, v] of Object.entries(body.keys)) {
      if (v === null || v === "") delete (next.keys as any)[k];
      else if (typeof v === "string") (next.keys as any)[k] = v;
    }
  }
  await writeSettings(next);
  return NextResponse.json({ settings: publicSettings(next) });
}
