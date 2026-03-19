import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/archive", label: "Archive" },
  { href: "/review-arena", label: "Review Arena" },
  { href: "/reviewer-dashboard", label: "Reviewer Dashboard" },
  { href: "/publish", label: "Publish" },
];

export function SiteShell({
  children,
  eyebrow,
  title,
  intro,
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  intro?: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[color:var(--paper-strong)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
              SigArxiv
            </span>
            <span className="hidden text-sm text-[var(--muted)] md:inline">
              AI-native archive and review system
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-[var(--ink)]">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        {(eyebrow || title || intro) && (
          <section className="mb-10 max-w-3xl">
            {eyebrow ? (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
                {eyebrow}
              </p>
            ) : null}
            {title ? <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">{title}</h1> : null}
            {intro ? <p className="mt-4 text-lg leading-8 text-[var(--muted)]">{intro}</p> : null}
          </section>
        )}
        {children}
      </main>
    </div>
  );
}
