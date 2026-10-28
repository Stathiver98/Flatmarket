import Link from "next/link";
import { clsx } from "clsx";
import type { CompletenessResult } from "@/lib/listing/completeness";
import { stepHref } from "@/lib/listing/steps";
import { Progress } from "@/components/ui/feedback";

export function CompletenessSummary({ c }: { c: CompletenessResult }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-muted">Πληρότητα αγγελίας</p>
          <p className="font-display text-5xl text-ink">{c.score}%</p>
        </div>
        <p className="max-w-xs text-right text-xs leading-relaxed text-ink-muted">
          Μετρά πόσες πληροφορίες έχετε δώσει — όχι την αξία ή την ποιότητα του ακινήτου.
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-medium text-ink">Βασικές πληροφορίες</span>
            <span className="text-ink-muted">{c.core.done}/{c.core.total}</span>
          </div>
          <Progress value={c.core.percent} label="Βασικές πληροφορίες" />
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-medium text-ink">Προαιρετικές λεπτομέρειες</span>
            <span className="text-ink-muted">{c.optional.done}/{c.optional.total}</span>
          </div>
          <Progress value={c.optional.percent} tone="olive" label="Προαιρετικές λεπτομέρειες" />
        </div>
      </div>
    </div>
  );
}

export function SuggestionList({ c, listingId, limit }: { c: CompletenessResult; listingId: string; limit?: number }) {
  const list = limit ? c.suggestions.slice(0, limit) : c.suggestions;
  if (list.length === 0) {
    return <p className="text-sm text-olive-700">Δεν υπάρχουν εκκρεμότητες. Η αγγελία έχει όλες τις πληροφορίες που παρακολουθούμε.</p>;
  }
  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-paper">
      {list.map((s) => (
        <li key={s.id}>
          <Link href={stepHref(listingId, s.step)} className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-stone-50">
            <span className="flex items-center gap-3">
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  s.state === "unknown"
                    ? "bg-stone-100 text-ink-soft"
                    : s.group === "core"
                      ? "bg-terracotta-50 text-terracotta-700"
                      : "bg-amber-50 text-amber-700",
                )}
              >
                {s.state === "unknown" ? "Δηλώθηκε άγνωστο" : s.group === "core" ? "Βασικό" : "Προαιρετικό"}
              </span>
              <span className="text-ink">{s.suggestion}</span>
            </span>
            <span className="shrink-0 text-ink-muted" aria-hidden="true">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
