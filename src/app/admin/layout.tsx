import Link from "next/link";
import { requireAdmin } from "@/server/auth/guards";
import { Wordmark } from "@/components/ui/wordmark";

export const metadata = { title: { default: "Διαχείριση", template: "%s · Διαχείριση Flatmarket" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const nav = [
    { href: "/admin", label: "Επισκόπηση" },
    { href: "/admin/listings", label: "Αγγελίες" },
    { href: "/admin/requests", label: "Αιτήματα" },
    { href: "/admin/users", label: "Χρήστες" },
  ];
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-ink text-paper">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Wordmark href="/admin" inverted className="text-base" />
          <span className="rounded-full bg-terracotta-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">Διαχείριση</span>
          <nav className="flex flex-1 gap-1 overflow-x-auto text-sm" aria-label="Διαχείριση">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-full px-3 py-1.5 text-stone-300 hover:bg-white/10 hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/app" className="text-sm text-stone-300 hover:text-white">Εφαρμογή →</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
