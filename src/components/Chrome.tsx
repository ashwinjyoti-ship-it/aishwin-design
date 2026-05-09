import Link from "next/link";

type Active = "projects" | "skills" | "design-systems" | "settings";

export function Chrome({ children, active }: { children: React.ReactNode; active?: Active }) {
  const item = (href: string, label: string, key: Active) => {
    const isActive = active === key;
    return (
      <Link
        href={href}
        className={
          "block rounded-r-md border-l-4 px-4 py-3 text-sm transition-all duration-fast " +
          (isActive
            ? "border-forge-amber bg-dark-charcoal text-warm-white"
            : "border-transparent text-ash-grey hover:bg-dark-charcoal hover:text-warm-white")
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-dvh bg-obsidian text-warm-white">
      <div className="flex min-h-dvh">
        <aside className="w-[240px] border-r border-warm-grey bg-charcoal px-4 py-8">
          <Link href="/" className="mb-8 block px-2">
            <span className="display text-xl">Aishwin Design</span>
          </Link>
          <nav className="space-y-2">
            {item("/", "Projects", "projects")}
            {item("/skills", "Skills", "skills")}
            {item("/design-systems", "Design systems", "design-systems")}
            {item("/settings", "Settings", "settings")}
          </nav>
          <form action="/api/auth/logout" method="post" className="mt-8 px-2">
            <button className="text-sm text-error transition-colors duration-fast hover:bg-[#B860601f] hover:text-warm-white" type="submit">
              Sign out
            </button>
          </form>
        </aside>
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
