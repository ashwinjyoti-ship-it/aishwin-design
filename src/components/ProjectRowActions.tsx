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

  const date = new Date(project.updated_at * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <li className="border-b rule group">
      <div className="py-4">
        {/* Name + date */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
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
                <div className="display text-[18px] md:text-[20px] tracking-tightish group-hover/link:underline underline-offset-4 decoration-rule">
                  {project.name}
                </div>
                {project.brief && <div className="text-[13px] text-muted mt-1 line-clamp-1">{project.brief}</div>}
              </Link>
            )}
          </div>
          <div className="text-[12px] text-muted shrink-0 pt-0.5">{date}</div>
        </div>

        {/* Pills + actions */}
        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="flex gap-1 flex-wrap">
            {project.skill_id && <span className="pill">{project.skill_id.replace("skl_", "")}</span>}
            {project.design_system_id && <span className="pill">{project.design_system_id.replace("ds_", "")}</span>}
          </div>
          {/* Always visible on mobile, hover-only on desktop */}
          <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button onClick={() => setIsEditing(true)} className="text-[11px] text-muted hover:text-ink" title="Rename">Rename</button>
            <button onClick={onFork} className="text-[11px] text-muted hover:text-ink" title="Fork">Fork</button>
            <button onClick={onDelete} className="text-[11px] text-muted hover:text-ink" title="Delete">Delete</button>
          </div>
        </div>
      </div>
    </li>
  );
}
