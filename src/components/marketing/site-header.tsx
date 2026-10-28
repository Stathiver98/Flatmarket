import Link from "next/link";
import { getCurrentUser } from "@/server/auth/session";
import { site } from "@/config/site";
import { Wordmark } from "@/components/ui/wordmark";
import { LinkButton } from "@/components/ui/button";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark className="text-lg" />
        <nav aria-label="Κύρια πλοήγηση" className="hidden items-center gap-1 lg:flex">
          {site.nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm text-ink-soft hover:bg-stone-100 hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <LinkButton href="/app" variant="dark" size="sm">
              Οι αγγελίες μου
            </LinkButton>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3 py-2 text-sm text-ink-soft hover:text-ink">
                Σύνδεση
              </Link>
              <LinkButton href="/signup" size="sm">
                Δημιουργία αγγελίας
              </LinkButton>
            </>
          )}
        </div>
        <details className="group relative lg:hidden">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-stone-300 bg-paper px-4 text-sm [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Μενού</span>
            <span className="hidden group-open:inline">Κλείσιμο</span>
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-stone-200 bg-paper p-2 shadow-[var(--shadow-lift)]">
            <nav aria-label="Κύρια πλοήγηση (κινητό)" className="flex flex-col">
              {site.nav.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-stone-100">
                  {n.label}
                </Link>
              ))}
              <div className="my-2 border-t border-stone-200" />
              {user ? (
                <Link href="/app" className="rounded-xl px-3 py-2.5 text-sm font-medium text-terracotta-700 hover:bg-stone-100">
                  Οι αγγελίες μου
                </Link>
              ) : (
                <>
                  <Link href="/login" className="rounded-xl px-3 py-2.5 text-sm hover:bg-stone-100">
                    Σύνδεση
                  </Link>
                  <Link href="/signup" className="rounded-xl px-3 py-2.5 text-sm font-medium text-terracotta-700 hover:bg-stone-100">
                    Δημιουργία αγγελίας
                  </Link>
                </>
              )}
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
