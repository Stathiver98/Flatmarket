import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { requireListingAccess } from "@/server/auth/guards";
import { completenessFor, getListingFull } from "@/server/listings/queries";
import { CompletenessSummary, SuggestionList } from "@/components/app/completeness-panel";
import { StepHeader } from "@/components/app/step-footer";
import { LinkButton } from "@/components/ui/button";
import { stepHref } from "@/lib/listing/steps";

export const metadata = { title: "Πληρότητα" };

export default async function CompletenessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireListingAccess(id, "read");
  const l = await getListingFull(id);
  if (!l) notFound();
  const c = completenessFor(l);
  const groups = [
    { id: "core", title: "Βασικές πληροφορίες", note: "Μετρούν 75% στον δείκτη." },
    { id: "optional", title: "Προαιρετικές λεπτομέρειες", note: "Μετρούν 25% στον δείκτη." },
  ] as const;
  return (
    <>
      <StepHeader n={5} title="Πληρότητα αγγελίας">
        Ένας διαφανής δείκτης για το πόση πληροφορία έχετε δώσει. Δεν αποτελεί εκτίμηση αξίας ούτε αξιολόγηση του ακινήτου. Όσα δηλώσατε
        ως «Δεν είναι γνωστό» μετρούν ως απαντημένα — δεν σας «τιμωρούμε» για στοιχεία που πραγματικά δεν γνωρίζετε.
      </StepHeader>
      <div className="space-y-8">
        <CompletenessSummary c={c} />
        <section>
          <h3 className="mb-3 text-lg font-semibold">Τι μπορείτε να προσθέσετε</h3>
          <SuggestionList c={c} listingId={id} />
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          {groups.map((g) => (
            <div key={g.id} className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-5">
              <h3 className="font-semibold">{g.title}</h3>
              <p className="text-xs text-ink-muted">{g.note} Τα στοιχεία που δεν αφορούν τον τύπο του ακινήτου σας παραλείπονται.</p>
              <ul className="mt-4 space-y-2 text-sm">
                {c.items
                  .filter((i) => i.group === g.id)
                  .map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3">
                      <Link href={stepHref(id, i.step)} className="hover:underline">{i.label}</Link>
                      <span
                        className={clsx(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs",
                          i.state === "done" ? "bg-olive-50 text-olive-700" : i.state === "unknown" ? "bg-stone-100 text-ink-soft" : "bg-amber-50 text-amber-700",
                        )}
                      >
                        {i.state === "done" ? "Συμπληρώθηκε" : i.state === "unknown" ? "Δηλώθηκε άγνωστο" : "Λείπει"}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
      <div className="mt-8 flex justify-between">
        <Link href={stepHref(id, "floor-plan")} className="text-sm text-ink-muted hover:text-ink">← Κάτοψη</Link>
        <LinkButton href={stepHref(id, "content")}>Συνέχεια: Κείμενα</LinkButton>
      </div>
    </>
  );
}
