import Link from "next/link";
import { notFound } from "next/navigation";
import { requireListingAccess } from "@/server/auth/guards";
import { getListingFull } from "@/server/listings/queries";
import { env } from "@/server/env";
import { StepHeader } from "@/components/app/step-footer";
import { CopyField, DeleteListingForm, PublishForm, PublishedControls } from "@/components/app/share-panel";
import { CopyTextButton } from "@/components/app/copy-text-button";
import { Alert, Badge, Card } from "@/components/ui/feedback";
import { buttonClass } from "@/components/ui/button-styles";
import { formatDateTime } from "@/lib/listing/format";
import { stepHref } from "@/lib/listing/steps";

export const metadata = { title: "Δημοσίευση & αρχεία" };

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  await requireListingAccess(id, "read");
  const l = await getListingFull(id);
  if (!l) notFound();
  const published = l.status === "PUBLISHED";
  const shareUrl = `${env.appUrl}/s/${l.shareToken}`;
  const publicUrl = l.slug ? `${env.appUrl}/p/${l.slug}` : null;
  const approvedText = (key: string, lang: string) =>
    l.content.find((c) => c.key === key && c.lang === lang && c.approved)?.text ?? null;
  const descEl = [approvedText("headline", "el"), approvedText("description", "el")].filter(Boolean).join("\n\n");
  const descEn = [approvedText("headline", "en"), approvedText("description", "en")].filter(Boolean).join("\n\n");
  const hasPhotos = l.photos.some((p) => p.includeInListing);
  const exp = (path: string) => `/api/listings/${id}/export/${path}`;
  const wrap = "h-auto! min-h-10 whitespace-normal! py-2 text-center";

  return (
    <>
      <StepHeader n={8} title="Δημοσίευση & αρχεία">
        Επιλέξτε πώς θα είναι διαθέσιμη η σελίδα παρουσίασης και κατεβάστε το υλικό σας. Μπορείτε να αποσύρετε την αγγελία
        οποτεδήποτε.
      </StepHeader>
      <div className="space-y-6">
        {notice === "unpublished" && !published && (
          <Alert tone="success" role="status">
            Η αγγελία αποσύρθηκε. Η σελίδα δεν είναι πλέον διαθέσιμη. Μπορείτε να τη δημοσιεύσετε ξανά οποτεδήποτε.
          </Alert>
        )}
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl text-ink">Σελίδα παρουσίασης</h3>
            {published ? (
              <Badge tone="success">{l.visibility === "PUBLIC" ? "Δημόσια" : "Μόνο με σύνδεσμο"}</Badge>
            ) : (
              <Badge>Μη δημοσιευμένη</Badge>
            )}
            {l.hasUnpublishedChanges && <Badge tone="warning">Μη δημοσιευμένες αλλαγές</Badge>}
          </div>
          {published && (
            <div className="mb-6 space-y-3">
              <p className="text-sm text-ink-soft">Δημοσιεύτηκε: {formatDateTime(l.lastPublishedAt)}</p>
              <div>
                <p className="mb-1 text-sm font-medium">Σύνδεσμος κοινοποίησης</p>
                <CopyField value={shareUrl} label="Σύνδεσμος κοινοποίησης" />
              </div>
              {l.visibility === "PUBLIC" && publicUrl && (
                <div>
                  <p className="mb-1 text-sm font-medium">Δημόσια διεύθυνση</p>
                  <CopyField value={publicUrl} label="Δημόσια διεύθυνση" />
                </div>
              )}
              <a
                href={l.visibility === "PUBLIC" && publicUrl ? publicUrl : shareUrl}
                target="_blank"
                rel="noopener"
                className="inline-block text-sm text-terracotta-700 hover:underline"
              >
                Άνοιγμα δημοσιευμένης σελίδας ↗
              </a>
              {l.visibility === "UNLISTED" && (
                <Alert tone="neutral">
                  Η σελίδα δεν είναι ευρετηριασμένη, αλλά όποιος έχει τον σύνδεσμο μπορεί να τη δει και να τον προωθήσει. Αν τον
                  στείλατε κατά λάθος, δημιουργήστε νέο σύνδεσμο.
                </Alert>
              )}
            </div>
          )}
          <PublishForm
            listingId={id}
            approved={Boolean(l.approvedAt)}
            published={published}
            currentVisibility={l.visibility}
            hasChanges={l.hasUnpublishedChanges}
          />
          {published && (
            <div className="mt-6 border-t border-stone-200 pt-5">
              <PublishedControls listingId={id} />
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="font-display text-2xl text-ink">Αρχεία για λήψη</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Τα αρχεία δημιουργούνται από τα τρέχοντα στοιχεία και περιλαμβάνουν μόνο εγκεκριμένα κείμενα και τις φωτογραφίες που
            έχετε επιλέξει για την αγγελία. Οι ψηφιακά επιπλωμένες εικόνες επισημαίνονται.
          </p>
          {!hasPhotos && (
            <Alert tone="warning" className="mt-4">
              Προσθέστε φωτογραφίες για να έχετε πλήρες υλικό.
            </Alert>
          )}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a className={buttonClass("dark", "md", wrap)} href={exp("brochure?lang=el")}>
              PDF φυλλάδιο (ελληνικά)
            </a>
            <a className={buttonClass("secondary", "md", wrap)} href={exp("brochure?lang=en")}>
              PDF brochure (English)
            </a>
            <a className={buttonClass("secondary", "md", wrap)} href={exp("factsheet?lang=el")}>
              Φύλλο στοιχείων (PDF)
            </a>
            <a className={buttonClass("secondary", "md", wrap)} href={exp("photos")}>
              Εγκεκριμένες φωτογραφίες (ZIP)
            </a>
            <a className={buttonClass("primary", "md", `${wrap} sm:col-span-2`)} href={exp("package")}>
              Πλήρες πακέτο: φωτογραφίες, κείμενα, PDF (ZIP)
            </a>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <CopyTextButton
              text={descEl}
              label="Αντιγραφή ελληνικής περιγραφής"
              emptyLabel="Δεν υπάρχει εγκεκριμένη ελληνική περιγραφή"
            />
            <CopyTextButton
              text={descEn}
              label="Copy English description"
              emptyLabel="Δεν υπάρχει εγκεκριμένη αγγλική περιγραφή"
            />
          </div>
        </Card>

        <Card className="border-danger-600/30 p-5 sm:p-6">
          <h3 className="font-semibold text-danger-600">Διαγραφή αγγελίας</h3>
          <div className="mt-3">
            <DeleteListingForm listingId={id} reference={l.reference} />
          </div>
        </Card>
      </div>
      <div className="mt-8">
        <Link href={stepHref(id, "review")} className="text-sm text-ink-muted hover:text-ink">
          ← Έλεγχος & έγκριση
        </Link>
      </div>
    </>
  );
}
