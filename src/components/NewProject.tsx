"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProject({ skills }: { skills: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [skill, setSkill] = useState<string>(skills[0]?.id || "");
  const [busy, setBusy] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, brief, skill_id: skill || null }),
    });
    const j = await res.json();
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
        <textarea className="field min-h-[110px]" value={brief} onChange={(e) => setBrief(e.target.value)}
          placeholder="What are you making, for whom, and what tone?" />
      </div>
      <div>
        <label className="label">Skill</label>
        <select className="field" value={skill} onChange={(e) => setSkill(e.target.value)}>
          <option value="">No skill</option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <button className="btn" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create project"}</button>
    </form>
  );
}
