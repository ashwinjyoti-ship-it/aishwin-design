import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { readSettings } from "@/lib/settings";

export const runtime = "edge";

interface PostBody {
  name?: string;
  websiteUrl?: string;
  brandIntent?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as PostBody;
  if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const settings = await readSettings();
  const providerId = settings.defaultProvider;
  const model = settings.defaultModel;
  const apiKey = settings.keys[providerId as keyof typeof settings.keys];
  if (!apiKey) return NextResponse.json({ error: `No API key for ${providerId}` }, { status: 400 });

  const provider = getProvider(providerId);
  if (!provider) return NextResponse.json({ error: `Unknown provider ${providerId}` }, { status: 400 });

  const system = `You are a design systems lead.
Create a design system markdown body in the same style as practical preloaded systems.
If URL is provided, infer visual language from that website.
Return JSON only with keys: summary, body.
Body must include sections: Colour, Typography, Spacing, Components.`;

  const user = `Design system name: ${body.name}
Reference URL: ${body.websiteUrl || ""}
Brand intent: ${body.brandIntent || ""}`;

  let assembled = "";
  for await (const delta of provider.stream({ apiKey, model, system, messages: [{ role: "user", content: user }] })) {
    assembled += delta;
  }

  try {
    const parsed = JSON.parse(assembled.match(/\{[\s\S]*\}/)?.[0] ?? assembled);
    if (!parsed?.body) throw new Error("bad format");
    return NextResponse.json({ summary: String(parsed.summary || ""), body: String(parsed.body) });
  } catch {
    return NextResponse.json({
      summary: `${body.name} design system generated`,
      body: `# ${body.name}\n\n${assembled}`,
    });
  }
}
