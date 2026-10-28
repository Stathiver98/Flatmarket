import { clsx } from "clsx";
import type { ReactNode } from "react";
import { pricing, formatEuro } from "@/config/pricing";
import { LinkButton } from "@/components/ui/button";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx("text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-600", className)}>{children}</p>;
}

export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="border-b border-stone-200/70">
      <Container className="py-16 sm:py-24">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display mt-4 max-w-4xl text-4xl leading-[1.08] text-ink sm:text-6xl">{title}</h1>
        {children && <div className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">{children}</div>}
      </Container>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, children, center }: { eyebrow?: string; title: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <div className={clsx("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="font-display mt-3 text-3xl leading-tight text-ink sm:text-[2.6rem]">{title}</h2>
      {children && <div className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">{children}</div>}
    </div>
  );
}

export function PackagesGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {pricing.packages.map((p) => {
          const highlighted = "highlighted" in p && p.highlighted;
          return (
            <div
              key={p.id}
              className={clsx(
                "flex flex-col rounded-[var(--radius-card)] border p-6",
                highlighted ? "border-ink bg-ink text-paper shadow-[var(--shadow-lift)]" : "border-stone-200 bg-paper",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-2xl">{p.name}</h3>
                {"assisted" in p && p.assisted && (
                  <span className={clsx("rounded-full px-2.5 py-0.5 text-[11px] font-medium", highlighted ? "bg-white/10 text-stone-200" : "bg-stone-100 text-ink-soft")}>
                    Με ανθρώπινη υποστήριξη
                  </span>
                )}
              </div>
              <p className={clsx("mt-2 text-sm leading-relaxed", highlighted ? "text-stone-300" : "text-ink-muted")}>{p.summary}</p>
              <p className="mt-6 flex items-baseline gap-2">
                {"fromPrice" in p && p.fromPrice && <span className={clsx("text-sm", highlighted ? "text-stone-300" : "text-ink-muted")}>από</span>}
                <span className="font-display text-4xl">{formatEuro(p.price)}</span>
                <span className={clsx("text-sm", highlighted ? "text-stone-300" : "text-ink-muted")}>{p.unit}</span>
              </p>
              {!compact && (
                <>
                  <ul className="mt-6 space-y-2.5 text-sm">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <CheckIcon className={highlighted ? "text-terracotta-100" : "text-terracotta-600"} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className={clsx("mt-5 space-y-1 border-t pt-4 text-xs", highlighted ? "border-white/15 text-stone-300" : "border-stone-200 text-ink-muted")}>
                    {p.limits.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </>
              )}
              <div className="mt-auto pt-6">
                <LinkButton
                  href={`/contact?type=PRICING&package=${p.id}`}
                  variant={highlighted ? "primary" : "secondary"}
                  className="w-full"
                >
                  Αίτημα για {p.name}
                </LinkButton>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 space-y-1 text-sm text-ink-muted">
        <p>{pricing.vatNote}</p>
        <p>{pricing.disclaimer}</p>
        <p>{pricing.paymentNote}</p>
      </div>
    </div>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={clsx("mt-0.5 h-4 w-4 shrink-0", className)} fill="currentColor" aria-hidden="true">
      <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
    </svg>
  );
}

export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="divide-y divide-stone-200 rounded-[var(--radius-card)] border border-stone-200 bg-paper">
      {items.map((it) => (
        <details key={it.q} className="group px-6 py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-ink [&::-webkit-details-marker]:hidden">
            {it.q}
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-stone-300 text-ink-soft transition-transform group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">{it.a}</div>
        </details>
      ))}
    </div>
  );
}

export function FinalCta({ title = "Ξεκινήστε με το ακίνητό σας σήμερα.", children }: { title?: string; children?: ReactNode }) {
  return (
    <section className="py-20">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-terracotta-700 px-6 py-14 text-center text-paper sm:px-12">
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="relative">
            <h2 className="font-display mx-auto max-w-2xl text-3xl leading-tight sm:text-5xl">{title}</h2>
            <p className="mx-auto mt-4 max-w-xl text-terracotta-100">
              {children ?? "Δημιουργήστε λογαριασμό, ανεβάστε φωτογραφίες και δείτε την παρουσίαση πριν αποφασίσετε τι θα δημοσιεύσετε."}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <LinkButton href="/signup" size="lg" variant="dark">
                Δημιουργία αγγελίας
              </LinkButton>
              <LinkButton href="/contact?type=DEMO" size="lg" variant="secondary">
                Ζητήστε παρουσίαση
              </LinkButton>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
