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
      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-8">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-cream">Studio</div>
          <h1 className="display mt-2 text-[36px] leading-[1.2]">Projects</h1>
          <p className="mt-3 max-w-[44ch] text-[15px] text-muted-cream">
            Each project keeps its own conversation, memory, and outputs. Pick a skill and a design system to frame the room.
          </p>
          <div className="mt-8 rounded-md border border-warm-grey bg-charcoal">
            {list.length === 0 ? (
              <div className="py-16 text-center text-[14px] text-ash-grey">No projects yet. Start one on the right.</div>
            ) : (
              <ul>
                {list.map((p) => (
                  <ProjectRow key={p.id} project={p} />
                ))}
              </ul>
            )}
          </div>
        </section>
        <aside className="col-span-12 rounded-md border border-warm-grey bg-charcoal p-6 lg:col-span-4 lg:w-[380px]">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-cream">New</div>
          <h2 className="mt-2 mb-6 text-[24px] font-semibold">Start a project</h2>
          <NewProject skills={skills.results ?? []} designSystems={designSystems.results ?? []} />
        </aside>
      </div>
    </Chrome>
  );
}
