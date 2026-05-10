import { NextRequest } from "next/server";
import { db, env } from "@/lib/env";
import { isAuthed } from "@/lib/auth";
import { id as makeId } from "@/lib/id";
import { readSettings } from "@/lib/settings";
import { getProvider } from "@/lib/providers";
import type { ChatMessage } from "@/lib/providers";
import { buildSystemPrompt, extractHtml } from "@/lib/prompts";
import { sha256 } from "@/lib/hash";
import { kvGet, kvPut } from "@/lib/kv";
import { r2Key, r2Put } from "@/lib/r2";

export const runtime = "edge";

interface PostBody { content: string }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed(req))) return new Response("unauthorized", { status: 401 });
  const { id: pid } = await params;
  const { content } = (await req.json().catch(() => ({}))) as PostBody;
  if (!content?.trim()) return new Response("empty", { status: 400 });

  const project = await db()
    .prepare("SELECT * FROM projects WHERE id = ?")
    .bind(pid)
    .first<{
      id: string; name: string; brief: string | null;
      skill_id: string | null; design_system_id: string | null;
      provider: string; model: string;
    }>();
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

  const designSystem = project.design_system_id
    ? await db().prepare("SELECT body FROM design_systems WHERE id = ?").bind(project.design_system_id).first<{ body: string }>()
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
    designSystemBody: designSystem?.body,
    memory: (memoryRows.results ?? []).map((m) => m.body),
    brief: project.brief,
    projectId: pid,
  });

  // KV cache key: hash of system + full message thread
  const cacheKey = `llm:${await sha256(system + JSON.stringify(messages))}`;

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assembled = "";
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send("user_message", { id: userMsgId, content });

        // Check KV cache for identical prompts
        const cached = await kvGet(cacheKey);
        if (cached) {
          assembled = cached;
          // Stream the cached response in one chunk
          send("delta", cached);
        } else {
          for await (const delta of provider.stream({ apiKey, model, system, messages })) {
            assembled += delta;
            send("delta", delta);
          }
          // Cache the response in KV (skip if very long / streaming-only)
          if (assembled.length < 200_000) {
            await kvPut(cacheKey, assembled).catch(() => {});
          }
        }

        const asstId = makeId("msg");
        const html = extractHtml(assembled);
        let artifactId: string | null = null;

        if (html) {
          artifactId = makeId("art");
          const htmlBytes = enc.encode(html);
          const key = r2Key("artifact", artifactId);

          // Try R2 first; fall back to D1 inline if R2 unavailable
          let storedInR2 = false;
          try {
            await r2Put(key, html, "text/html");
            storedInR2 = true;
          } catch {}

          await db()
            .prepare(
              "INSERT INTO artifacts (id, project_id, message_id, kind, r2_key, body_inline, size_bytes) VALUES (?, ?, ?, 'html', ?, ?, ?)",
            )
            .bind(
              artifactId,
              pid,
              asstId,
              storedInR2 ? key : null,
              storedInR2 ? null : html,
              htmlBytes.length,
            )
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
