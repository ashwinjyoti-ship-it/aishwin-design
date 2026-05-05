import { db } from "@/lib/env";
import { Chrome } from "@/components/Chrome";
import { DesignSystemsManager } from "@/components/DesignSystemsManager";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function DesignSystemsPage() {
  const rows = await db()
    .prepare("SELECT id, name, summary, preloaded, updated_at FROM design_systems ORDER BY preloaded DESC, name ASC")
    .all<{ id: string; name: string; summary: string; preloaded: number; updated_at: number }>();
  return (
    <Chrome active="design-systems">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Design systems</div>
      <h1 className="display text-[44px] leading-[1.05] mt-2">Visual vocabulary</h1>
      <p className="text-[15px] text-muted mt-3 max-w-[56ch]">
        A design system is a 9-section Markdown file: colour, typography, spacing, layout, components, motion, voice, brand, anti-patterns. Five come preloaded. Write your own.
      </p>
      <DesignSystemsManager initial={rows.results ?? []} />
    </Chrome>
  );
}
