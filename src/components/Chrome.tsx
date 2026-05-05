import Link from "next/link";

export function Chrome({ children, active }: { children: React.ReactNode; active?: "projects" | "skills" | "settings" }) {
  const link = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={
        "text-[13px] tracking-tightish " + (active === key ? "text-ink" : "text-muted hover:text-ink")
      }
    >
      {label}
    </Link>
  );
  return (
    <div className="min-h-dvh">
      <header className="border-b rule">
        <div className="mx-auto max-w-[1280px] px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Mark />
            <span className="display text-[17px]">Aishwin Design</span>
          </Link>
          <nav className="flex items-center gap-7">
            {link("/", "Projects", "projects")}
            {link("/skills", "Skills", "skills")}
            {link("/settings", "Settings", "settings")}
            <form action="/api/auth/logout" method="post">
              <button className="text-[13px] tracking-tightish text-muted hover:text-ink" type="submit">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-8 py-12">{children}</main>
      <footer className="border-t rule mt-24">
        <div className="mx-auto max-w-[1280px] px-8 h-12 flex items-center justify-between text-[12px] text-muted">
          <span className="tracking-tightish">A small studio for designing with agents.</span>
          <span className="tracking-[0.14em] uppercase">v0.1</span>
        </div>
      </footer>
    </div>
  );
}

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="4" y="5" width="16" height="15" rx="1.5" />
      <path d="M8 3.5v3M16 3.5v3M4 9.5h16" />
      <circle cx="9" cy="14" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
