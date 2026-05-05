import { NextRequest } from "next/server";
import { db } from "@/lib/env";
import { isAuthed } from "@/lib/auth";
import { id as makeId } from "@/lib/id";
import { readSettings } from "@/lib/settings";
import { getProvider } from "@/lib/providers";
import type { ChatMessage } from "@/lib/providers";
import { buildSystemPrompt, extractHtml } from "@/lib/prompts";
import { env } from "@/lib/env";

export const runtime = "edge";

interface PostBody { content: string }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return new Response("unauthorized", { status: 401 });
  const { id: pid } = await params;
  const { content } = (await req.json().catch(() => ({}))) as PostBody;
  if (!content?.trim()) return new Response("empty", { status: 400 });

  const project = await db()
    .prepare("SELECT * FROM projects WHERE id = ?")
    .bind(pid)
    .first<{ id: string; name: string; brief: string | null; skill_id: string | null; provider: string; model: string }>();
  if (!project) return new Response("not found", { status: 404 });

  const settings = await readSettings();
  const providerId = project.provider || settings.defaultProvider;
  const model = project.model || settings.defaultModel;
  const apiKey = settings.keys[providerId as keyof typeof settings.keys];
  if (!apiKey) return new Response(`No API key set for ${providerId}. Add one in Settings.`, { status: 400 });
  const provider = getProvider(providerId);
  if (!provider) return new Response(`unknown provider ${providerId}`, { status: 400 });

  const skill = project.skill_id
    ? await db().prepare("SELECT body FROM skills WHERE id = ?").bind(project.skill_id).first<{ body: string }>()
    : null;
  const memoryRows = await db()
    .prepare("SELECT body FROM memory WHERE project_id = ? ORDER BY pinned DESC, updated_at DESC LIMIT 30")
    .bind(pid)
    .all<{ body: string }>();
  const history = await db()
    .prepare("SELECT role, content FROM messages WHERE project_id = ? ORDER BY created_at ASC")
    .bind(pid)
    .all<{ role: "user" | "assistant"; content: string }>();

  const userMsgId = makeId("msg");
  await db()
    .prepare("INSERT INTO messages (id, project_id, role, content) VALUES (?, ?, 'user', ?)")
    .bind(userMsgId, pid, content)
    .run();

  const messages: ChatMessage[] = [
    ...(history.results ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content },
  ];

  const system = buildSystemPrompt({
    appName: env().APP_NAME || "Aishwin Design",
    skillBody: skill?.body,
    memory: (memoryRows.results ?? []).map((m) => m.body),
    brief: project.brief,
  });

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assembled = "";
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        send("user_message", { id: userMsgId, content });
        for await (const delta of provider.stream({ apiKey, model, system, messages })) {
          assembled += delta;
          send("delta", delta);
        }

        const asstId = makeId("msg");
        const html = extractHtml(assembled);
        let artifactId: string | null = null;
        if (html) {
          artifactId = makeId("art");
          await db()
            .prepare("INSERT INTO artifacts (id, project_id, message_id, kind, body) VALUES (?, ?, ?, 'html', ?)")
            .bind(artifactId, pid, asstId, html)
            .run();
        }
        await db()
          .prepare("INSERT INTO messages (id, project_id, role, content, artifact_key) VALUES (?, ?, 'assistant', ?, ?)")
          .bind(asstId, pid, assembled, artifactId)
          .run();
        await db().prepare("UPDATE projects SET updated_at = unixepoch() WHERE id = ?").bind(pid).run();
        send("done", { id: asstId, artifact_id: artifactId });
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
