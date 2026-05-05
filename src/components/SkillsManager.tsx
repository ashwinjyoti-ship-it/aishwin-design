"use client";

import { useEffect, useMemo, useState } from "react";

interface Row { id: string; name: string; summary: string; preloaded: number; updated_at: number; body?: string }

export function SkillsManager({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [draft, setDraft] = useState<{ name: string; summary: string; body: string } | null>(null);
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  useEffect(() => {
    if (!selectedId) { setDraft(null); return; }
    fetch(`/api/skills/${selectedId}`).then((r) => r.json()).then((j) => {
      if (j.skill) setDraft({ name: j.skill.name, summary: j.skill.summary, body: j.skill.body });
    });
  }, [selectedId]);

  async function refresh() {
    const r = await fetch("/api/skills").then((r) => r.json());
    setRows(r.skills ?? []);
  }

  async function onNew() {
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "New skill", summary: "", body: "# New skill\n\nDescribe sections and guardrails." }),
    });
    const j = await res.json();
    if (res.ok && j.id) {
      await refresh();
      setSelectedId(j.id);
    }
  }

  async function onSave() {
    if (!selected || !draft) return;
    await fetch(`/api/skills/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    await refresh();
  }

  async function onDelete() {
    if (!selected || selected.preloaded) return;
    await fetch(`/api/skills/${selected.id}`, { method: "DELETE" });
    setSelectedId(null);
    await refresh();
  }

  return (
    <div className="mt-10 grid grid-cols-12 gap-10">
      <aside className="col-span-12 md:col-span-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted">All skills</div>
          <button onClick={onNew} className="text-[12px] tracking-tightish hover:text-ink text-muted">+ New</button>
        </div>
        <ul className="border-t rule">
          {rows.map((r) => (
            <li key={r.id} className="border-b rule">
              <button
                onClick={() => setSelectedId(r.id)}
                className={"w-full text-left py-4 grid grid-cols-12 gap-3 " + (r.id === selectedId ? "" : "hover:opacity-70")}
              >
                <div className="col-span-9">
                  <div className="display text-[17px] text-ink">{r.name}</div>
                  <div className="text-[12px] text-muted mt-1 line-clamp-1">{r.summary}</div>
                </div>
                <div className="col-span-3 text-right">
                  <span className="pill">{r.preloaded ? "preloaded" : "custom"}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="col-span-12 md:col-span-8 md:border-l rule md:pl-10">
        {!selected || !draft ? (
          <div className="text-muted text-[14px]">Pick a skill to edit, or create one.</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="pill">{selected.preloaded ? "preloaded" : "custom"}</span>
              <div className="flex items-center gap-3">
                <button className="btn-ghost h-8 px-3 text-[12px]" onClick={onSave}>Save</button>
                {!selected.preloaded && (
                  <button className="btn-ghost h-8 px-3 text-[12px]" onClick={onDelete}>Delete</button>
                )}
              </div>
            </div>
            <div>
              <label className="label">Name</label>
              <input className="field" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Summary</label>
              <input className="field" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
            </div>
            <div>
              <label className="label">Body (Markdown)</label>
              <textarea
                className="field font-mono text-[13px] leading-[1.55] min-h-[420px]"
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
