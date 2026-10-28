import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireListingAccess } from "@/server/auth/guards";
import { completenessFor, getListingFull, publicationBlockers } from "@/server/listings/queries";
import { CompletenessSummary, SuggestionList } from "@/components/app/completeness-panel";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/listing/format";
import { LISTING_STEPS, stepHref } from "@/lib/listing/steps";

const EVENT_LABELS: Record<string, string> = {
  created: "Δημιουργία αγγελίας",
  first_photo_uploaded: "Πρώτη φωτογραφία",
  content_generated: "Δημιουργία προτάσεων κειμένου",
  submitted_for_review: "Αποστολή για έλεγχο",
  approved: "Έγκριση αγγελίας",
  published: "Δημοσίευση",
  unpublished: "Απόσυρση",
  archived: "Αρχειοθέτηση",
  restored: "Επαναφορά",
  share_link_regenerated: "Νέος σύνδεσμος κοινοποίησης",
  admin_status_changed: "Αλλαγή κατάστασης από την ομάδα Flatmarket",
};

export default async function ListingOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireListingAccess(id, "read");
  const l = await getListingFull(id);
  if (!l) notFound();
  const c = completenessFor(l);
  const blockers = publicationBlockers(l);
  const events = await db.listingEvent.findMany({ where: { listingId: id }, orderBy: { createdAt: "desc" }, take: 8 });
  const nextStep = c.missingCore[0]?.step ?? (l.approvedAt ? "share" : "review");
  const nextLabel = LISTING_STEPS.find((s) => s.id === nextStep)?.label;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <CompletenessSummary c={c} />
        <Card className="flex flex-col justify-between p-6">
          <div>
            <p className="text-sm font-medium text-ink-muted">Επόμενο βήμα</p>
            <p className="font-display mt-1 text-2xl text-ink">{nextLabel}</p>
            <p className="mt-2 text-sm text-ink-soft">
              {blockers.length === 0
                ? "Η αγγελία πληροί τις προϋποθέσεις για έγκριση και δημοσίευση."
                : `${blockers.length} εκκρεμότητες πριν τη δημοσίευση.`}
            </p>
          </div>
          <LinkButton href={stepHref(id, nextStep)} className="mt-5 self-start">
            Συνέχεια
          </LinkButton>
        </Card>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Προτάσεις</h2>
        <SuggestionList c={c} listingId={id} limit={6} />
        {c.suggestions.length > 6 && (
          <Link href={stepHref(id, "completeness")} className="mt-2 inline-block text-sm text-terracotta-700 hover:underline">
            Όλες οι προτάσεις ({c.suggestions.length}) →
          </Link>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Ιστορικό</h2>
        <ul className="space-y-2 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex justify-between gap-4 border-b border-stone-200 pb-2">
              <span className="text-ink">{EVENT_LABELS[e.type] ?? e.type}</span>
              <span className="text-ink-muted">{formatDateTime(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
