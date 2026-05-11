"use client";

import { useEffect, useMemo, useState } from "react";

interface Row { id: string; name: string; summary: string; body: string; preloaded: number; updated_at: number }

export function SkillsManager({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [draft, setDraft] = useState<{ name: string; summary: string; body: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [wizard, setWizard] = useState({ name: "", goal: "", audience: "", inputs: "", outputs: "", constraints: "", style: "", askBeforeRisky: true });
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  useEffect(() => {
    if (!selectedId) { setDraft(null); return; }
    const row = rows.find((r) => r.id === selectedId);
    if (row) setDraft({ name: row.name, summary: row.summary, body: row.body });
  }, [rows, selectedId]);

  async function refresh() {
    const r = await fetch("/api/skills", { credentials: "include" }).then((r) => r.json() as any);
    setRows(r.skills ?? []);
  }

  async function onNew() {
    setCreating(true);
    setError(null);
    const defaultBody = "# New skill\n\nDescribe sections and guardrails.";
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "New skill", summary: "", body: defaultBody }),
      });
      const j = await res.json() as any;
      if (res.ok && j.id) {
        setSelectedId(j.id);
        setDraft({ name: "New skill", summary: "", body: defaultBody });
        refresh(); // sync list in background
      } else {
        setError(j.error ?? "Failed to create skill");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setCreating(false);
    }
  }



  async function onGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const gen = await fetch("/api/skills/generate", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(wizard) });
      const gj = await gen.json() as any;
      if (!gen.ok) throw new Error(gj.error || "Failed to generate");
      const res = await fetch("/api/skills", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: wizard.name || "New skill", summary: gj.summary || "", body: gj.body || "" }) });
      const j = await res.json() as any;
      if (!res.ok || !j.id) throw new Error(j.error || "Failed to save");
      setWizardOpen(false);
      setSelectedId(j.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  }

  async function onSave() {
    if (!selected || !draft) return;
    await fetch(`/api/skills/${selected.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    await refresh();
  }

  async function onDelete() {
    if (!selected || selected.preloaded) return;
    await fetch(`/api/skills/${selected.id}`, { method: "DELETE", credentials: "include" });
    setSelectedId(null);
    await refresh();
  }

  return (
    <div className="mt-10 grid grid-cols-12 gap-10">
      <aside className="col-span-12 md:col-span-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted">All skills</div>
          <button onClick={() => setWizardOpen(true)} className="text-[12px] tracking-tightish hover:text-ink text-muted disabled:opacity-40">+ New</button>
        </div>
        {error && <div className="mb-3 text-[12px] text-error">{error}</div>}
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

      {wizardOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-paper border rule w-full max-w-2xl p-5 space-y-3">
            <div className="display text-[18px]">New Skill Wizard</div>
            <input className="field" placeholder="Skill name" value={wizard.name} onChange={(e)=>setWizard({...wizard,name:e.target.value})} />
            <textarea className="field" placeholder="Goal" value={wizard.goal} onChange={(e)=>setWizard({...wizard,goal:e.target.value})} />
            <textarea className="field" placeholder="Audience" value={wizard.audience} onChange={(e)=>setWizard({...wizard,audience:e.target.value})} />
            <textarea className="field" placeholder="Inputs" value={wizard.inputs} onChange={(e)=>setWizard({...wizard,inputs:e.target.value})} />
            <textarea className="field" placeholder="Outputs" value={wizard.outputs} onChange={(e)=>setWizard({...wizard,outputs:e.target.value})} />
            <textarea className="field" placeholder="Constraints" value={wizard.constraints} onChange={(e)=>setWizard({...wizard,constraints:e.target.value})} />
            <input className="field" placeholder="Style" value={wizard.style} onChange={(e)=>setWizard({...wizard,style:e.target.value})} />
            <label className="text-[12px] text-muted"><input type="checkbox" checked={wizard.askBeforeRisky} onChange={(e)=>setWizard({...wizard,askBeforeRisky:e.target.checked})} /> Ask before risky actions</label>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost h-8 px-3 text-[12px]" onClick={()=>setWizardOpen(false)}>Cancel</button>
              <button className="btn-ghost h-8 px-3 text-[12px]" disabled={generating} onClick={onGenerate}>{generating?"Generating…":"Generate + Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
