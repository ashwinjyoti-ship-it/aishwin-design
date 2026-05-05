"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Project { id: string; name: string; brief: string | null; skill_id: string | null; provider: string; model: string }
interface Message { id: string; role: "user" | "assistant" | "system"; content: string; artifact_key: string | null; created_at: number }
interface Memory { id: string; body: string; pinned: number; updated_at: number }
interface Skill { id: string; name: string }
interface ProviderSpec { id: string; label: string; models: string[] }

interface Props {
  project: Project;
  messages: Message[];
  memory: Memory[];
  skills: Skill[];
  providers: ProviderSpec[];
}

export function ProjectCanvas({ project, messages: initialMsgs, memory: initialMem, skills, providers }: Props) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Message[]>(initialMsgs);
  const [memory, setMemory] = useState<Memory[]>(initialMem);
  const [streaming, setStreaming] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [showMemory, setShowMemory] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const lastArtifact = [...msgs].reverse().find((m) => m.artifact_key)?.artifact_key ?? null;

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length, streaming]);

  async function send() {
    const content = input.trim();
    if (!content || busy) return;
    setBusy(true); setInput(""); setStreaming("");
    setMsgs((m) => [...m, { id: "tmp_u", role: "user", content, artifact_key: null, created_at: Date.now() / 1000 }]);

    const res = await fetch(`/api/projects/${project.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok || !res.body) {
      const text = await res.text();
      setMsgs((m) => [...m.filter((x) => x.id !== "tmp_u"),
        { id: "tmp_u", role: "user", content, artifact_key: null, created_at: Date.now() / 1000 },
        { id: "tmp_e", role: "assistant", content: `Error: ${text}`, artifact_key: null, created_at: Date.now() / 1000 }]);
      setBusy(false); return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = ""; let assembled = ""; let userIdReplaced = false;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, idx); buf = buf.slice(idx + 2);
        const evtLine = block.split("\n").find((l) => l.startsWith("event:"));
        const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
        if (!evtLine || !dataLine) continue;
        const evt = evtLine.slice(6).trim();
        const data = JSON.parse(dataLine.slice(5).trim());
        if (evt === "user_message" && !userIdReplaced) {
          userIdReplaced = true;
          setMsgs((m) => m.map((x) => x.id === "tmp_u" ? { ...x, id: data.id } : x));
        } else if (evt === "delta") {
          assembled += data;
          setStreaming(assembled);
        } else if (evt === "done") {
          setMsgs((m) => [...m, { id: data.id, role: "assistant", content: assembled, artifact_key: data.artifact_id, created_at: Date.now() / 1000 }]);
          setStreaming("");
        } else if (evt === "error") {
          setMsgs((m) => [...m, { id: "err_" + Date.now(), role: "assistant", content: `Error: ${data.message}`, artifact_key: null, created_at: Date.now() / 1000 }]);
          setStreaming("");
        }
      }
    }
    setBusy(false);
    router.refresh();
  }

  async function patchProject(body: Partial<Project>) {
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function addMemory(body: string) {
    if (!body.trim()) return;
    const res = await fetch(`/api/projects/${project.id}/memory`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, pinned: false }),
    });
    if (res.ok) {
      const j = await res.json();
      setMemory((m) => [{ id: j.id, body, pinned: 0, updated_at: Date.now() / 1000 }, ...m]);
    }
  }

  async function deleteMemory(mid: string) {
    await fetch(`/api/projects/${project.id}/memory`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mid }),
    });
    setMemory((m) => m.filter((x) => x.id !== mid));
  }

  const activeProviderModels = providers.find((p) => p.id === project.provider)?.models ?? [];

  return (
    <div className="-mt-12 -mx-8">
      <div className="border-b rule">
        <div className="mx-auto max-w-[1280px] px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => history.back()} className="text-[12px] text-muted hover:text-ink">&larr; Projects</button>
            <span className="text-[12px] text-muted">/</span>
            <input
              defaultValue={project.name}
              onBlur={(e) => e.target.value !== project.name && patchProject({ name: e.target.value })}
              className="display text-[17px] bg-transparent outline-none focus:underline underline-offset-4 decoration-rule"
            />
          </div>
          <div className="flex items-center gap-2">
            <select className="field h-8 py-0 text-[12px] w-[150px]"
              value={project.skill_id ?? ""}
              onChange={(e) => patchProject({ skill_id: (e.target.value || null) as any })}>
              <option value="">No skill</option>
              {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="field h-8 py-0 text-[12px] w-[120px]"
              value={project.provider}
              onChange={(e) => patchProject({ provider: e.target.value, model: providers.find((p) => p.id === e.target.value)?.models[0] })}>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <select className="field h-8 py-0 text-[12px] w-[180px]"
              value={project.model}
              onChange={(e) => patchProject({ model: e.target.value })}>
              {activeProviderModels.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => setShowMemory((s) => !s)} className="btn-ghost h-8 px-3 text-[12px]">
              Memory · {memory.length}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 h-[calc(100dvh-(56px+48px))]">
        <section className="col-span-5 border-r rule flex flex-col">
          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-8 py-8 space-y-7">
            {msgs.length === 0 && (
              <div className="text-muted text-[14px] max-w-[36ch]">
                Tell the agent what you&rsquo;re making. It will ask one question if it needs to, then ship a single-file artifact.
              </div>
            )}
            {msgs.map((m) => (
              <MessageView key={m.id} m={m} />
            ))}
            {streaming && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">Assistant</div>
                <div className="text-[14.5px] leading-[1.65] whitespace-pre-wrap font-mono text-ink/90">{streaming}</div>
              </div>
            )}
          </div>
          <div className="border-t rule p-5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
              placeholder="Brief, change, or question. ⌘↵ to send."
              className="field min-h-[88px] mb-3"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted">{busy ? "Streaming…" : "Idle"}</span>
              <button onClick={send} disabled={busy || !input.trim()} className="btn h-9 px-4 text-[13px]">Send</button>
            </div>
          </div>
        </section>
        <section className="col-span-7 bg-paper relative">
          {lastArtifact ? (
            <iframe
              key={lastArtifact}
              src={`/api/artifacts/${lastArtifact}`}
              sandbox="allow-same-origin"
              className="w-full h-full bg-white"
            />
          ) : (
            <div className="grid place-items-center h-full text-muted text-[14px]">
              The latest HTML artifact appears here.
            </div>
          )}
        </section>
      </div>

      {showMemory && (
        <MemoryDrawer
          memory={memory}
          onAdd={addMemory}
          onDelete={deleteMemory}
          onClose={() => setShowMemory(false)}
        />
      )}
    </div>
  );
}

function MessageView({ m }: { m: Message }) {
  const isUser = m.role === "user";
  const stripHtml = (s: string) => s.replace(/```html[\s\S]*?```/gi, "").trim();
  const displayed = isUser ? m.content : stripHtml(m.content);
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">{isUser ? "You" : "Assistant"}</div>
      <div className={"text-[14.5px] leading-[1.65] whitespace-pre-wrap " + (isUser ? "" : "font-mono text-ink/90")}>
        {displayed || (m.artifact_key ? "[artifact emitted →]" : "")}
      </div>
      {m.artifact_key && (
        <a href={`/api/artifacts/${m.artifact_key}`} target="_blank" className="inline-block mt-2 text-[12px] text-muted hover:text-ink underline underline-offset-4 decoration-rule">
          Open artifact in new tab
        </a>
      )}
    </div>
  );
}

function MemoryDrawer({ memory, onAdd, onDelete, onClose }: {
  memory: Memory[]; onAdd: (b: string) => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="fixed inset-0 z-30 flex">
      <div className="flex-1 bg-ink/20" onClick={onClose} />
      <aside className="w-[420px] bg-paper border-l rule flex flex-col">
        <div className="border-b rule h-12 px-6 flex items-center justify-between">
          <div className="display text-[16px]">Project memory</div>
          <button onClick={onClose} className="text-[12px] text-muted hover:text-ink">Close</button>
        </div>
        <div className="px-6 py-5 border-b rule">
          <textarea
            placeholder="A durable note: the brand tone, a constraint, a decision."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="field min-h-[80px] mb-3"
          />
          <button className="btn-ghost h-8 px-3 text-[12px]" onClick={() => { onAdd(draft); setDraft(""); }}>Add note</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {memory.length === 0 ? (
            <div className="px-6 py-8 text-[13px] text-muted">No memory yet. Notes here are appended to every prompt.</div>
          ) : (
            <ul>
              {memory.map((m) => (
                <li key={m.id} className="px-6 py-4 border-b rule">
                  <div className="text-[13.5px] leading-[1.55]">{m.body}</div>
                  <button onClick={() => onDelete(m.id)} className="mt-2 text-[11px] text-muted hover:text-ink">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
