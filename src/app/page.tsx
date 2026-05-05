import Link from "next/link";
import { db } from "@/lib/env";
import { Chrome } from "@/components/Chrome";
import { NewProject } from "@/components/NewProject";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await db()
    .prepare("SELECT id, name, brief, skill_id, provider, model, updated_at FROM projects ORDER BY updated_at DESC")
    .all<{ id: string; name: string; brief: string | null; skill_id: string | null; provider: string; updated_at: number }>();
  const skills = await db()
    .prepare("SELECT id, name FROM skills ORDER BY preloaded DESC, name ASC")
    .all<{ id: string; name: string }>();
  const list = projects.results ?? [];
  return (
    <Chrome active="projects">
      <div className="grid grid-cols-12 gap-12">
        <section className="col-span-12 md:col-span-7">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Studio</div>
          <h1 className="display text-[44px] leading-[1.05] mt-2">Projects</h1>
          <p className="text-[15px] text-muted mt-3 max-w-[44ch]">
            Each project keeps its own conversation, memory, and outputs. Pick a skill to set the room you&rsquo;re designing in.
          </p>

          <div className="mt-10 border-t rule">
            {list.length === 0 ? (
              <div className="py-16 text-center text-muted text-[14px]">No projects yet. Start one on the right.</div>
            ) : (
              <ul>
                {list.map((p) => (
                  <li key={p.id} className="border-b rule">
                    <Link href={`/projects/${p.id}`} className="grid grid-cols-12 gap-4 py-5 group">
                      <div className="col-span-7">
                        <div className="display text-[20px] tracking-tightish group-hover:text-ink text-ink">{p.name}</div>
                        {p.brief && <div className="text-[13px] text-muted mt-1 line-clamp-1">{p.brief}</div>}
                      </div>
                      <div className="col-span-3 self-center">
                        <span className="pill">{p.skill_id || "no skill"}</span>
                      </div>
                      <div className="col-span-2 self-center text-right text-[12px] text-muted">
                        {new Date(p.updated_at * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <aside className="col-span-12 md:col-span-5 md:pl-8 md:border-l rule">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">New</div>
          <h2 className="display text-[24px] mt-2 mb-6">Start a project</h2>
          <NewProject skills={skills.results ?? []} />
        </aside>
      </div>
    </Chrome>
  );
}
