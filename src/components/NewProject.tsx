"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  skills: { id: string; name: string }[];
  designSystems: { id: string; name: string }[];
}

export function NewProject({ skills, designSystems }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [skill, setSkill] = useState<string>(skills[0]?.id || "");
  const [ds, setDs] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, brief, skill_id: skill || null, design_system_id: ds || null }),
    });
    const j = await res.json() as any;
    setBusy(false);
    if (res.ok && j.id) router.push(`/projects/${j.id}`);
  }

  return (
    <form onSubmit={onCreate} className="space-y-5">
      <div>
        <label className="label">Name</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Atlas marketing site" />
      </div>
      <div>
        <label className="label">Brief</label>
        <textarea
          className="field min-h-[110px]"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="What are you making, for whom, and what tone?"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="label h-[14px] leading-[14px]">Skill</label>
          <select className="field h-[40px] py-0" value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="">No skill</option>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="label h-[14px] leading-[14px]">Design system</label>
          <select className="field h-[40px] py-0" value={ds} onChange={(e) => setDs(e.target.value)}>
            <option value="">None</option>
            {designSystems.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <button className="btn" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create project"}</button>
    </form>
  );
}
