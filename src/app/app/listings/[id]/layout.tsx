import Link from "next/link";
import { notFound } from "next/navigation";
import { isWorkspaceMember, requireListingAccess } from "@/server/auth/guards";
import { completenessFor, getListingFull } from "@/server/listings/queries";
import { StepNav } from "@/components/app/step-nav";
import { Alert, Badge, StatusBadge } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { defaultTitle } from "@/lib/listing/format";

export default async function ListingLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireListingAccess(id, "read");
  const l = await getListingFull(id);
  if (!l) notFound();
  const readOnly = !(await isWorkspaceMember(user.id, l.workspaceId));
  const completeness = completenessFor(l);
  const headline = l.content.find((c) => c.key === "headline" && c.lang === "el" && c.approved)?.text;
  const title = headline ?? l.title ?? defaultTitle(l, "el");
  const stepState = {
    basics: !completeness.items.some((i) => i.step === "basics" && i.group === "core" && i.state === "missing"),
    details: !completeness.items.some((i) => i.step === "details" && i.state === "missing"),
    photos: !completeness.items.some((i) => i.step === "photos" && i.group === "core" && i.state === "missing"),
    "floor-plan": l.floorPlans.length > 0,
    completeness: completeness.missingCore.length === 0,
    content: !completeness.items.some((i) => i.step === "content" && i.group === "core" && i.state === "missing"),
    review: Boolean(l.approvedAt),
    share: l.status === "PUBLISHED" && !l.hasUnpublishedChanges,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Link href="/app" className="text-sm text-ink-muted hover:text-ink">← Όλες οι αγγελίες</Link>
          <h1 className="font-display mt-2 truncate text-3xl text-ink sm:text-4xl">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={l.status} />
            {l.status === "PUBLISHED" && <Badge>{l.visibility === "PUBLIC" ? "Δημόσια" : "Μόνο με σύνδεσμο"}</Badge>}
            {l.hasUnpublishedChanges && <Badge tone="warning">Μη δημοσιευμένες αλλαγές</Badge>}
            <span className="text-ink-muted">Κωδικός {l.reference}</span>
            <span className="text-ink-muted">· Πληρότητα {completeness.score}%</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/app/listings/${id}/preview`} variant="secondary" size="sm">
            Προεπισκόπηση
          </LinkButton>
          {!readOnly && (
            <LinkButton href={`/app/listings/${id}/share`} size="sm">
              {l.status === "PUBLISHED" ? "Δημοσίευση & αρχεία" : "Δημοσίευση"}
            </LinkButton>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {readOnly && (
          <Alert tone="info" title="Προβολή διαχειριστή">
            Βλέπετε αυτή την αγγελία ως διαχειριστής. Οι αλλαγές γίνονται μόνο από τον ιδιοκτήτη ή το γραφείο.
          </Alert>
        )}
        {l.status === "ARCHIVED" && <Alert tone="info">Η αγγελία είναι αρχειοθετημένη και δεν είναι δημόσια.</Alert>}
        {l.status === "AWAITING_REVIEW" && (
          <Alert tone="warning" title="Σε έλεγχο από την ομάδα Flatmarket">
            Μπορείτε να συνεχίσετε τις αλλαγές. Θα δείτε εδώ τις παρατηρήσεις της ομάδας.
          </Alert>
        )}
        {l.adminNotes && (
          <Alert tone="info" title="Σημείωση από την ομάδα Flatmarket">
            <p className="whitespace-pre-line">{l.adminNotes}</p>
          </Alert>
        )}
        {l.status === "PUBLISHED" && l.hasUnpublishedChanges && (
          <Alert tone="warning" title="Υπάρχουν αλλαγές που δεν έχουν δημοσιευτεί">
            Η δημόσια σελίδα εξακολουθεί να δείχνει την προηγούμενη εγκεκριμένη έκδοση. Εγκρίνετε ξανά στο βήμα «Έλεγχος &
            έγκριση» και ενημερώστε τη σελίδα από το βήμα «Δημοσίευση & αρχεία».
          </Alert>
        )}
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <StepNav listingId={id} done={stepState} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
