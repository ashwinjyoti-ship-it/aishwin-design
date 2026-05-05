import { db } from "@/lib/env";
import { Chrome } from "@/components/Chrome";
import { SkillsManager } from "@/components/SkillsManager";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const rows = await db()
    .prepare("SELECT id, name, summary, preloaded, updated_at FROM skills ORDER BY preloaded DESC, name ASC")
    .all<{ id: string; name: string; summary: string; preloaded: number; updated_at: number }>();
  return (
    <Chrome active="skills">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Skills</div>
      <h1 className="display text-[44px] leading-[1.05] mt-2">Rooms to design in</h1>
      <p className="text-[15px] text-muted mt-3 max-w-[56ch]">
        A skill is a small markdown file that sets the brief, sections, and guardrails. Six come preloaded. Add your own.
      </p>
      <SkillsManager initial={rows.results ?? []} />
    </Chrome>
  );
}
