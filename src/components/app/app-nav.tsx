"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Wordmark } from "@/components/ui/wordmark";
import { logout } from "@/server/actions/auth";

export function AppNav({ user, showTeam }: { user: { name: string; email: string; isAdmin: boolean }; showTeam: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/app", label: "Αγγελίες", match: (p: string) => p === "/app" || p.startsWith("/app/listings") },
    { href: "/app/enquiries", label: "Μηνύματα", match: (p: string) => p.startsWith("/app/enquiries") },
    ...(showTeam ? [{ href: "/app/team", label: "Ομάδα", match: (p: string) => p.startsWith("/app/team") }] : []),
    { href: "/app/settings", label: "Ρυθμίσεις", match: (p: string) => p.startsWith("/app/settings") },
    ...(user.isAdmin ? [{ href: "/admin", label: "Διαχείριση", match: (p: string) => p.startsWith("/admin") }] : []),
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Wordmark href="/app" className="text-base" />
        <nav aria-label="Εφαρμογή" className="-mx-2 flex flex-1 gap-1 overflow-x-auto">
          {links.map((l) => {
            const active = l.match(pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-ink text-paper" : "text-ink-soft hover:bg-stone-100 hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-stone-200 py-1 pl-1 pr-3 text-sm [&::-webkit-details-marker]:hidden">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-terracotta-600 text-xs font-semibold text-white" aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
          </summary>
          <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-stone-200 bg-paper p-2 shadow-[var(--shadow-lift)]">
            <p className="truncate px-3 py-2 text-xs text-ink-muted">{user.email}</p>
            <Link href="/" className="block rounded-xl px-3 py-2 text-sm hover:bg-stone-100">
              Αρχική σελίδα Flatmarket
            </Link>
            <form action={logout}>
              <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-sm text-danger-600 hover:bg-danger-50">
                Αποσύνδεση
              </button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
