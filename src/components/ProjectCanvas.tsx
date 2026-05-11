"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: string; name: string; brief: string | null;
  skill_id: string | null; design_system_id: string | null;
  provider: string; model: string;
}
interface Message { id: string; role: "user" | "assistant" | "system"; content: string; artifact_key: string | null; created_at: number }
interface Memory { id: string; body: string; pinned: number; updated_at: number }
interface Skill { id: string; name: string }
interface DesignSystem { id: string; name: string }
interface ProviderSpec { id: string; label: string; models: string[] }

interface Props {
  project: Project;
  messages: Message[];
  memory: Memory[];
  skills: Skill[];
  designSystems: DesignSystem[];
  providers: ProviderSpec[];
}

export function ProjectCanvas({ project, messages: initialMsgs, memory: initialMem, skills, designSystems, providers }: Props) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Message[]>(initialMsgs);
  const [memory, setMemory] = useState<Memory[]>(initialMem);
  const [streaming, setStreaming] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [showMemory, setShowMemory] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [previewWidth, setPreviewWidth] = useState<"390px" | "768px" | "100%">("100%");
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [streamCollapsed, setStreamCollapsed] = useState(false);
  const [splitPct, setSplitPct] = useState(42); // left panel width %
  const [resizing, setResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const codeBoxRef = useRef<HTMLDivElement>(null);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(75, Math.max(25, pct)));
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const lastArtifact = [...msgs].reverse().find((m) => m.artifact_key)?.artifact_key ?? null;
  const changeZoom = (delta: number) =>
    setZoom((z) => Math.round(Math.min(2, Math.max(0.25, z + delta)) * 100) / 100);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length, streaming]);

  useEffect(() => {
    if (!streamCollapsed) codeBoxRef.current?.scrollTo({ top: codeBoxRef.current.scrollHeight });
  }, [streaming, streamCollapsed]);

  async function send() {
    const content = input.trim();
    if (!content || busy) return;
    setError(null);
    setBusy(true); setInput(""); setStreaming("");
    setMsgs((m) => [...m, { id: "tmp_u", role: "user", content, artifact_key: null, created_at: Date.now() / 1000 }]);

    const res = await fetch(`/api/projects/${project.id}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok || !res.body) {
      const text = await res.text();
      setMsgs((m) => [...m.filter((x) => x.id !== "tmp_u"),
        { id: "tmp_u", role: "user", content, artifact_key: null, created_at: Date.now() / 1000 },
        { id: "err_" + Date.now(), role: "assistant", content: `Error: ${text}`, artifact_key: null, created_at: Date.now() / 1000 }]);
      setBusy(false); return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = ""; let assembled = ""; let userIdReplaced = false;
    try {
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
            if (data.artifact_id) setIframeKey((k) => k + 1);
          } else if (evt === "error") {
            setMsgs((m) => [...m, { id: "err_" + Date.now(), role: "assistant", content: `Error: ${data.message}`, artifact_key: null, created_at: Date.now() / 1000 }]);
            setStreaming("");
          }
        }
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stream failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadArtifact() {
    if (!lastArtifact) return;
    const res = await fetch(`/api/artifacts/${lastArtifact}`);
    if (!res.ok) return;
    const html = await res.text();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}-${lastArtifact}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function patchProject(body: Partial<Project>) {
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function addMemory(body: string) {
    if (!body.trim()) return;
    const res = await fetch(`/api/projects/${project.id}/memory`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, pinned: false }),
    });
    if (res.ok) {
      const j = await res.json() as any;
      setMemory((m) => [{ id: j.id, body, pinned: 0, updated_at: Date.now() / 1000 }, ...m]);
    }
  }

  async function deleteMemory(mid: string) {
    await fetch(`/api/projects/${project.id}/memory`, {
      method: "DELETE",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mid }),
    });
    setMemory((m) => m.filter((x) => x.id !== mid));
  }

  const activeProviderModels = providers.find((p) => p.id === project.provider)?.models ?? [];

  return (
    <div className="-mt-8 -mx-8">
      <div className="border-b rule">
        <div className="mx-auto max-w-[1280px] px-8 h-12 flex items-center gap-3 overflow-x-auto">
          <button onClick={() => history.back()} className="text-[12px] text-muted hover:text-ink shrink-0">&larr;</button>
          <input
            defaultValue={project.name}
            onBlur={(e) => e.target.value !== project.name && patchProject({ name: e.target.value })}
            className="display text-[17px] bg-transparent outline-none focus:underline underline-offset-4 decoration-rule min-w-0 max-w-[180px] truncate"
          />
          <span className="text-muted text-[12px] shrink-0">/</span>

          <select className="field h-8 py-0 text-[12px] w-[130px] shrink-0"
            value={project.skill_id ?? ""}
            onChange={(e) => patchProject({ skill_id: (e.target.value || null) as any })}>
            <option value="">No skill</option>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select className="field h-8 py-0 text-[12px] w-[130px] shrink-0"
            value={project.design_system_id ?? ""}
            onChange={(e) => patchProject({ design_system_id: (e.target.value || null) as any })}>
            <option value="">No design system</option>
            {designSystems.map((ds) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
          </select>

          <select className="field h-8 py-0 text-[12px] w-[110px] shrink-0"
            value={project.provider}
            onChange={(e) => patchProject({ provider: e.target.value, model: providers.find((p) => p.id === e.target.value)?.models[0] })}>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>

          <select className="field h-8 py-0 text-[12px] w-[160px] shrink-0"
            value={project.model}
            onChange={(e) => patchProject({ model: e.target.value })}>
            {activeProviderModels.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <button onClick={() => setShowMemory((s) => !s)} className="btn-ghost h-8 px-3 text-[12px] shrink-0 ml-auto">
            Memory · {memory.length}
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex h-[calc(100dvh-48px)] relative">
        {resizing && <div className="absolute inset-0 z-50 cursor-col-resize" />}
        <section className="border-r rule flex flex-col shrink-0 overflow-hidden" style={{ width: `${splitPct}%` }}>
          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-8 py-8 space-y-7">
            {msgs.length === 0 && (
              <div className="text-muted text-[14px] max-w-[36ch] leading-relaxed">
                Tell the agent what you&rsquo;re making. It will ask one clarifying question if needed, then ship a single-file HTML artifact.
              </div>
            )}
            {msgs.map((m) => <MessageView key={m.id} m={m} />)}
            {streaming && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2 flex items-center justify-between">
                  <span>Assistant</span>
                  <button
                    onClick={() => setStreamCollapsed((c) => !c)}
                    className="text-[11px] text-muted hover:text-ink"
                  >
                    {streamCollapsed ? "Expand ↓" : "Collapse ↑"}
                  </button>
                </div>
                {!streamCollapsed && (
                  <div
                    ref={codeBoxRef}
                    className="max-h-[260px] overflow-y-auto rounded border rule bg-ink/[0.03] p-3 text-[13px] leading-[1.6] whitespace-pre-wrap font-mono text-ink/80"
                  >
                    {streaming}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="border-t rule p-5">
            {error && <div className="text-[12px] text-red-600 mb-2">{error}</div>}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
              placeholder="Brief, change, or question. ⌘↵ to send."
              className="field min-h-[88px] mb-3"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted">{busy ? "Streaming…" : "Idle"}</span>
              <button onClick={send} disabled={busy || !input.trim()} className="btn h-9 px-4 text-[13px]">
                Send
              </button>
            </div>
          </div>
        </section>

        {/* Resizable divider */}
        <div
          onMouseDown={onDividerMouseDown}
          className="w-1 shrink-0 cursor-col-resize bg-rule hover:bg-ink/20 active:bg-ink/30 transition-colors"
          style={{ userSelect: "none" }}
        />

        <section className="flex-1 bg-paper relative flex flex-col min-w-0">
          <div className="border-b rule px-4 h-10 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button onClick={() => setPreviewWidth("390px")} className={previewWidth === "390px" ? "text-[12px] px-2 py-1 rounded bg-ink text-paper" : "text-[12px] px-2 py-1 rounded text-muted hover:text-ink"}>📱</button>
              <button onClick={() => setPreviewWidth("768px")} className={previewWidth === "768px" ? "text-[12px] px-2 py-1 rounded bg-ink text-paper" : "text-[12px] px-2 py-1 rounded text-muted hover:text-ink"}>💻</button>
              <button onClick={() => setPreviewWidth("100%")} className={previewWidth === "100%" ? "text-[12px] px-2 py-1 rounded bg-ink text-paper" : "text-[12px] px-2 py-1 rounded text-muted hover:text-ink"}>🖥️</button>
              <span className="w-px h-4 bg-current opacity-10 mx-1 shrink-0" />
              <button onClick={() => changeZoom(-0.25)} disabled={zoom <= 0.25} className="text-[12px] px-2 py-1 rounded text-muted hover:text-ink disabled:opacity-30">−</button>
              <button onClick={() => setZoom(1)} className="text-[12px] px-2 py-1 rounded text-muted hover:text-ink tabular-nums w-[42px] text-center">{Math.round(zoom * 100)}%</button>
              <button onClick={() => changeZoom(0.25)} disabled={zoom >= 2} className="text-[12px] px-2 py-1 rounded text-muted hover:text-ink disabled:opacity-30">+</button>
            </div>
            {lastArtifact && (
              <button onClick={downloadArtifact} className="text-[12px] text-muted hover:text-ink underline underline-offset-4 decoration-rule">
                Download HTML
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto bg-[#f5f5f5]" style={{ maxWidth: previewWidth, margin: "0 auto", width: "100%", transition: "max-width 0.3s ease" }}>
            {lastArtifact ? (
              <div style={{
                width: zoom > 1 ? `${zoom * 100}%` : "100%",
                height: zoom > 1 ? `${zoom * 100}%` : "100%",
                minWidth: "100%",
                minHeight: "100%",
                position: "relative",
              }}>
                <iframe
                  key={`${lastArtifact}-${iframeKey}`}
                  src={`/api/artifacts/${lastArtifact}`}
                  sandbox="allow-same-origin allow-scripts"
                  style={{
                    display: "block",
                    width: zoom > 1 ? `${(1 / zoom) * 100}%` : "100%",
                    height: zoom > 1 ? `${(1 / zoom) * 100}%` : "100%",
                    background: "white",
                    transform: `scale(${zoom})`,
                    transformOrigin: zoom > 1 ? "top left" : "top center",
                    pointerEvents: resizing ? "none" : undefined,
                  }}
                />
              </div>
            ) : (
              <div className="grid place-items-center w-full h-full text-muted text-[14px]">
                The latest HTML artifact appears here.
              </div>
            )}
          </div>
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
  const displayed = isUser ? m.content : m.content.replace(/```html[\s\S]*?```/gi, "").trim();
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">{isUser ? "You" : "Assistant"}</div>
      <div className={"text-[14.5px] leading-[1.65] whitespace-pre-wrap " + (isUser ? "" : "font-mono text-ink/90")}>
        {displayed || (m.artifact_key ? "[artifact emitted →]" : "")}
      </div>
      {m.artifact_key && (
        <a href={`/api/artifacts/${m.artifact_key}`} target="_blank" className="inline-block mt-2 text-[12px] text-muted hover:text-ink underline underline-offset-4 decoration-rule">
          Open in new tab
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
            placeholder="A durable note: brand tone, constraint, decision."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="field min-h-[80px] mb-3"
          />
          <button className="btn-ghost h-8 px-3 text-[12px]" onClick={() => { onAdd(draft); setDraft(""); }}>
            Add note
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {memory.length === 0 ? (
            <div className="px-6 py-8 text-[13px] text-muted">
              No memory yet. Notes here are appended to every prompt in this project.
            </div>
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
