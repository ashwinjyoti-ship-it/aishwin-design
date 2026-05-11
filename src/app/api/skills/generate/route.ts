import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { readSettings } from "@/lib/settings";

export const runtime = "edge";

interface PostBody {
  name?: string;
  goal?: string;
  audience?: string;
  inputs?: string;
  outputs?: string;
  constraints?: string;
  style?: string;
  askBeforeRisky?: boolean;
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

  const system = `You are a senior AI workflow architect.
Create a production-ready skill file in markdown.
Research current best practices and existing skill patterns on the web, then synthesize.
Output format:
1) First line: a short one-sentence summary.
2) Then full markdown body starting with # <Skill Name>
Keep it practical, concise, and directly usable.`;

  const user = `Skill name: ${body.name}
Goal: ${body.goal || ""}
Audience: ${body.audience || ""}
Inputs user provides: ${body.inputs || ""}
Expected outputs: ${body.outputs || ""}
Constraints/guardrails: ${body.constraints || ""}
Tone/style preference: ${body.style || ""}
Ask before risky actions: ${body.askBeforeRisky ? "yes" : "no"}

Return JSON only with keys: summary, body`;

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
      summary: `${body.name} skill generated`,
      body: `# ${body.name}\n\n${assembled}`,
    });
  }
}
