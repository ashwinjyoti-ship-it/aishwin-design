import { notFound } from "next/navigation";
import { db } from "@/lib/env";
import { Chrome } from "@/components/Chrome";
import { ProjectCanvas } from "@/components/ProjectCanvas";
import { PROVIDER_ORDER, PROVIDERS } from "@/lib/providers";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db().prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!project) notFound();

  const messages = await db()
    .prepare("SELECT id, role, content, artifact_key, created_at FROM messages WHERE project_id = ? ORDER BY created_at ASC")
    .bind(id)
    .all();
  const memory = await db()
    .prepare("SELECT id, body, pinned, updated_at FROM memory WHERE project_id = ? ORDER BY pinned DESC, updated_at DESC")
    .bind(id)
    .all();
  const skills = await db()
    .prepare("SELECT id, name FROM skills ORDER BY preloaded DESC, name ASC")
    .all();
  const designSystems = await db()
    .prepare("SELECT id, name FROM design_systems ORDER BY preloaded DESC, name ASC")
    .all();

  const providers = PROVIDER_ORDER.map((p) => ({
    id: p,
    label: PROVIDERS[p].label,
    models: PROVIDERS[p].models,
  }));

  return (
    <Chrome active="projects">
      <ProjectCanvas
        project={project as any}
        messages={(messages.results ?? []) as any}
        memory={(memory.results ?? []) as any}
        skills={(skills.results ?? []) as any}
        designSystems={(designSystems.results ?? []) as any}
        providers={providers}
      />
    </Chrome>
  );
}
