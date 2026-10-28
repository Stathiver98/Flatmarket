import Link from "next/link";
import { notFound } from "next/navigation";
import { requireListingAccess } from "@/server/auth/guards";
import { completenessFor, getListingFull, publicationBlockers } from "@/server/listings/queries";
import { buildPresentation } from "@/server/listings/presentation";
import { isEmailConfigured } from "@/server/env";
import { StepHeader } from "@/components/app/step-footer";
import { ApprovalForm, ContactSettingsForm, RequestReviewButton } from "@/components/app/review-forms";
import { SuggestionList } from "@/components/app/completeness-panel";
import { Badge, Card } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { keyFacts, missingInformation, presentationTitle, priceText, roomLabel } from "@/lib/listing/presentation";
import { precisionLabel } from "@/lib/listing/format";
import { CONTENT_KEYS, CONTENT_KEY_LABELS } from "@/lib/listing/options";
import { stepHref } from "@/lib/listing/steps";

export const metadata = { title: "Έλεγχος & έγκριση" };

function ReviewSection({ title, editHref, children }: { title: string; editHref: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-ink">{title}</h3>
        <Link href={editHref} className="text-sm text-terracotta-700 hover:underline">Επεξεργασία</Link>
      </div>
      {children}
    </Card>
  );
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireListingAccess(id, "read");
  const l = await getListingFull(id);
  if (!l) notFound();
  const p = buildPresentation(l);
  const blockers = publicationBlockers(l);
  const c = completenessFor(l);
  const facts = keyFacts(p, "el");
  const missing = missingInformation(p, "el");
  const hasStaged = p.photos.some((x) => x.kind === "STAGED");

  return (
    <>
      <StepHeader n={7} title="Έλεγχος & έγκριση">
        Δείτε συγκεντρωμένα όσα θα εμφανίζονται δημόσια. Τίποτα δεν δημοσιεύεται αυτόματα.
      </StepHeader>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/preview/${id}`} variant="secondary">Άνοιγμα πλήρους προεπισκόπησης</LinkButton>
          {l.status === "DRAFT" && <RequestReviewButton listingId={id} />}
        </div>

        <ReviewSection title="Στοιχεία ακινήτου" editHref={stepHref(id, "basics")}>
          <p className="font-display text-2xl text-ink">{presentationTitle(p, "el")}</p>
          <p className="mt-1 text-sm text-ink-muted">{p.location ?? "Χωρίς τοποθεσία"} · {priceText(p, "el")}</p>
          <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="flex justify-between gap-3 border-b border-stone-100 py-1">
                <dt className="text-ink-muted">{f.label}</dt>
                <dd className="text-right text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
          {missing.length > 0 && (
            <p className="mt-3 text-sm text-ink-soft">
              <span className="font-medium">Θα εμφανίζεται ως «μη δηλωμένο»:</span> {missing.join(", ")}
            </p>
          )}
        </ReviewSection>

        <ReviewSection title="Απόρρητο και ορατότητα" editHref={stepHref(id, "basics")}>
          <ul className="space-y-1.5 text-sm text-ink-soft">
            <li>Δημόσια τοποθεσία: <strong className="text-ink">{precisionLabel(l.locationPrecision)}</strong> — «{p.location ?? "—"}»</li>
            <li>
              Διεύθυνση:{" "}
              {l.locationPrecision === "EXACT" ? (
                <strong className="text-amber-700">θα εμφανίζεται δημόσια</strong>
              ) : (
                <strong className="text-ink">ιδιωτική — δεν εμφανίζεται</strong>
              )}
            </li>
            <li>Οι πρωτότυπες φωτογραφίες και τα μεταδεδομένα τους (π.χ. τοποθεσία λήψης) δεν δημοσιεύονται ποτέ.</li>
            <li>Τρέχουσα κατάσταση: {l.status === "PUBLISHED" ? (l.visibility === "PUBLIC" ? "δημόσια" : "μόνο με σύνδεσμο") : "μη δημοσιευμένη"}.</li>
          </ul>
        </ReviewSection>

        <ReviewSection title={`Φωτογραφίες (${p.photos.length})`} editHref={stepHref(id, "photos")}>
          {p.photos.length === 0 ? (
            <p className="text-sm text-ink-muted">Δεν υπάρχουν φωτογραφίες στην αγγελία.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {p.photos.map((ph) => (
                <li key={ph.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/photos/${ph.id}?s=thumb${ph.variantId ? `&v=${ph.variantId}` : ""}`}
                    alt={roomLabel(ph.room, ph.roomLabel, "el")}
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                  <span className="mt-1 block truncate text-[11px] text-ink-muted">{roomLabel(ph.room, ph.roomLabel, "el")}</span>
                  {ph.isCover && <Badge tone="dark" className="absolute left-1 top-1">Εξώφυλλο</Badge>}
                  {ph.kind === "ENHANCED" && <Badge tone="success" className="absolute right-1 top-1">Βελτιωμένη</Badge>}
                  {ph.kind === "STAGED" && <Badge tone="warning" className="absolute right-1 top-1">Ψηφιακή επίπλωση</Badge>}
                </li>
              ))}
            </ul>
          )}
          {l.floorPlans.length > 0 && <p className="mt-3 text-sm text-ink-soft">Κατόψεις: {l.floorPlans.length} (με {l.floorPlans.reduce((a, f) => a + f.hotspots.length, 0)} σημεία χώρων)</p>}
        </ReviewSection>

        <ReviewSection title="Κείμενα" editHref={stepHref(id, "content")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["el", "en"] as const).map((lg) => (
              <ul key={lg} className="space-y-1.5 text-sm">
                <li className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{lg === "el" ? "Ελληνικά" : "English"}</li>
                {CONTENT_KEYS.map((k) => {
                  const s = l.content.find((x) => x.key === k && x.lang === lg);
                  return (
                    <li key={k} className="flex justify-between gap-3">
                      <span>{CONTENT_KEY_LABELS[k].el}</span>
                      {s?.approved ? <Badge tone="success">Εγκεκριμένο</Badge> : s ? <Badge tone="warning">Μη εγκεκριμένο</Badge> : <Badge>Κενό</Badge>}
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
          {p.content.el.description && (
            <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm text-ink-soft">{p.content.el.description}</p>
          )}
        </ReviewSection>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold text-ink">Επικοινωνία, παρουσίαση και περιήγηση</h3>
          <ContactSettingsForm
            listingId={id}
            emailConfigured={isEmailConfigured()}
            v={{
              contactName: l.contactName,
              contactEmail: l.contactEmail,
              contactPhone: l.contactPhone,
              showContactEmail: l.showContactEmail,
              showContactPhone: l.showContactPhone,
              enquiriesEnabled: l.enquiriesEnabled,
              showBranding: l.showBranding,
              externalTourUrl: l.externalTourUrl,
            }}
          />
        </Card>

        {c.suggestions.length > 0 && (
          <section>
            <h3 className="mb-3 font-semibold">Πληροφορίες που λείπουν</h3>
            <SuggestionList c={c} listingId={id} limit={8} />
          </section>
        )}

        <Card className="border-ink p-5">
          <h3 className="mb-4 font-display text-2xl text-ink">Τελική έγκριση</h3>
          <ApprovalForm listingId={id} blockers={blockers} approved={Boolean(l.approvedAt)} hasStaged={hasStaged} />
        </Card>
      </div>
      <div className="mt-8 flex justify-between">
        <Link href={stepHref(id, "content")} className="text-sm text-ink-muted hover:text-ink">← Κείμενα</Link>
        <LinkButton href={stepHref(id, "share")}>Συνέχεια: Δημοσίευση & αρχεία</LinkButton>
      </div>
    </>
  );
}
