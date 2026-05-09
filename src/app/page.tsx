import { db } from "@/lib/env";
import { Chrome } from "@/components/Chrome";
import { NewProject } from "@/components/NewProject";
import { ProjectRow } from "@/components/ProjectRowActions";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function Home() {
  const [projects, skills, designSystems] = await Promise.all([
    db().prepare("SELECT id, name, brief, skill_id, design_system_id, provider, updated_at FROM projects ORDER BY updated_at DESC").all<{
      id: string; name: string; brief: string | null; skill_id: string | null; design_system_id: string | null;
      provider: string; updated_at: number;
    }>(),
    db().prepare("SELECT id, name FROM skills ORDER BY preloaded DESC, name ASC").all<{ id: string; name: string }>(),
    db().prepare("SELECT id, name FROM design_systems ORDER BY preloaded DESC, name ASC").all<{ id: string; name: string }>(),
  ]);
  const list = projects.results ?? [];
  return (
    <Chrome active="projects">
      <div className="grid grid-cols-12 gap-12">
        <section className="col-span-12 md:col-span-7">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Studio</div>
          <h1 className="display text-[44px] leading-[1.05] mt-2">Projects</h1>
          <p className="text-[15px] text-muted mt-3 max-w-[44ch]">
            Each project keeps its own conversation, memory, and outputs. Pick a skill and a design system to frame the room.
          </p>
          <div className="mt-10 border-t rule">
            {list.length === 0 ? (
              <div className="py-16 text-center text-muted text-[14px]">No projects yet. Start one on the right.</div>
            ) : (
              <ul>
                {list.map((p) => (
                  <ProjectRow key={p.id} project={p} />
                ))}
              </ul>
            )}
          </div>
        </section>
        <aside className="col-span-12 md:col-span-5 md:pl-8 md:border-l rule">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">New</div>
          <h2 className="display text-[24px] mt-2 mb-6">Start a project</h2>
          <NewProject skills={skills.results ?? []} designSystems={designSystems.results ?? []} />
        </aside>
      </div>
    </Chrome>
  );
}
