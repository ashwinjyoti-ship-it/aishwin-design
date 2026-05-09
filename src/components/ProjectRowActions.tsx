"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  project: {
    id: string;
    name: string;
    brief: string | null;
    skill_id: string | null;
    design_system_id: string | null;
    updated_at: number;
  };
}

export function ProjectRow({ project }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);

  async function onRename() {
    if (!editName.trim() || editName === project.name) {
      setIsEditing(false);
      return;
    }
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setIsEditing(false);
    router.refresh();
  }

  async function onDelete() {
    if (!window.confirm("Delete this project and all its messages?")) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function onFork() {
    const res = await fetch(`/api/projects/${project.id}/fork`, { method: "POST" });
    const j = await res.json() as any;
    if (res.ok && j.id) {
      router.push(`/projects/${j.id}`);
    }
  }

  return (
    <li className="border-b rule group">
      <div className="grid grid-cols-12 gap-4 py-5 items-center">
        <div className="col-span-7">
          {isEditing ? (
            <form onSubmit={(e) => { e.preventDefault(); onRename(); }} className="flex items-center gap-2">
              <input
                className="field py-1 text-[16px] display"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                onBlur={onRename}
              />
            </form>
          ) : (
            <Link href={`/projects/${project.id}`} className="group/link">
              <div className="display text-[20px] tracking-tightish group-hover/link:underline underline-offset-4 decoration-rule">
                {project.name}
              </div>
              {project.brief && <div className="text-[13px] text-muted mt-1 line-clamp-1">{project.brief}</div>}
            </Link>
          )}
        </div>
        <div className="col-span-3 self-center flex gap-1 flex-wrap">
          {project.skill_id && <span className="pill">{project.skill_id.replace("skl_", "")}</span>}
          {project.design_system_id && <span className="pill">{project.design_system_id.replace("ds_", "")}</span>}
        </div>
        <div className="col-span-2 self-center text-right">
          <div className="text-[12px] text-muted">{new Date(project.updated_at * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
          <div className="flex items-center justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setIsEditing(true)} className="text-[11px] text-muted hover:text-ink" title="Rename">Rename</button>
            <button onClick={onFork} className="text-[11px] text-muted hover:text-ink" title="Fork">Fork</button>
            <button onClick={onDelete} className="text-[11px] text-muted hover:text-ink" title="Delete">Delete</button>
          </div>
        </div>
      </div>
    </li>
  );
}
