import Link from "next/link";

type Active = "projects" | "skills" | "design-systems" | "settings";

export function Chrome({ children, active }: { children: React.ReactNode; active?: Active }) {
  const sidebarItem = (href: string, label: string, key: Active) => {
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

  const mobileNavItem = (href: string, label: string, key: Active) => {
    const isActive = active === key;
    return (
      <Link
        href={href}
        className={
          "shrink-0 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors duration-fast " +
          (isActive
            ? "border-forge-amber text-warm-white"
            : "border-transparent text-ash-grey")
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-dvh bg-obsidian text-warm-white">
      {/* Mobile header — hidden on md+ */}
      <header className="md:hidden sticky top-0 z-20 bg-charcoal border-b border-warm-grey">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <Link href="/" className="display text-lg leading-none">Aishwin Design</Link>
          <form action="/api/auth/logout" method="post">
            <button className="text-[12px] text-ash-grey hover:text-warm-white" type="submit">Sign out</button>
          </form>
        </div>
        <nav className="flex overflow-x-auto scrollbar-none px-2">
          {mobileNavItem("/", "Projects", "projects")}
          {mobileNavItem("/skills", "Skills", "skills")}
          {mobileNavItem("/design-systems", "Design systems", "design-systems")}
          {mobileNavItem("/settings", "Settings", "settings")}
        </nav>
      </header>

      {/* Desktop layout — hidden on mobile */}
      <div className="hidden md:flex min-h-dvh">
        <aside className="w-[240px] shrink-0 border-r border-warm-grey bg-charcoal px-4 py-8">
          <Link href="/" className="mb-8 block px-2">
            <span className="display text-xl">Aishwin Design</span>
          </Link>
          <nav className="space-y-2">
            {sidebarItem("/", "Projects", "projects")}
            {sidebarItem("/skills", "Skills", "skills")}
            {sidebarItem("/design-systems", "Design systems", "design-systems")}
            {sidebarItem("/settings", "Settings", "settings")}
          </nav>
          <form action="/api/auth/logout" method="post" className="mt-8 px-2">
            <button className="text-sm text-error transition-colors duration-fast hover:bg-[#B860601f] hover:text-warm-white" type="submit">
              Sign out
            </button>
          </form>
        </aside>
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>

      {/* Mobile main content */}
      <main className="md:hidden px-4 py-6">{children}</main>
    </div>
  );
}
