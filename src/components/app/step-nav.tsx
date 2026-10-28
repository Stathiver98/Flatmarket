"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LISTING_STEPS, stepHref } from "@/lib/listing/steps";

export function StepNav({ listingId, done }: { listingId: string; done: Record<string, boolean> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Βήματα αγγελίας" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
      <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {LISTING_STEPS.map((s) => {
          const href = stepHref(listingId, s.id);
          const active = pathname === href;
          const complete = done[s.id];
          return (
            <li key={s.id} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "step" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors lg:rounded-xl",
                  active ? "bg-ink text-paper" : "text-ink-soft hover:bg-stone-100 hover:text-ink",
                )}
              >
                <span
                  className={clsx(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                    active ? "bg-paper text-ink" : complete ? "bg-olive-600 text-white" : "border border-stone-300 bg-paper text-ink-muted",
                  )}
                  aria-hidden="true"
                >
                  {complete && !active ? "✓" : s.n}
                </span>
                <span className="whitespace-nowrap">
                  <span className="lg:hidden">{s.short}</span>
                  <span className="hidden lg:inline">{s.label}</span>
                </span>
                {complete && <span className="sr-only">(ολοκληρώθηκε)</span>}
              </Link>
            </li>
          );
        })}
      </ol>
      <Link
        href={`/app/listings/${listingId}`}
        className={clsx(
          "mt-3 hidden rounded-xl px-3 py-2 text-sm lg:block",
          pathname === `/app/listings/${listingId}` ? "bg-stone-200 text-ink" : "text-ink-muted hover:bg-stone-100",
        )}
      >
        Επισκόπηση αγγελίας
      </Link>
    </nav>
  );
}
