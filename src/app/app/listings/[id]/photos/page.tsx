import Link from "next/link";
import { notFound } from "next/navigation";
import { requireListingAccess } from "@/server/auth/guards";
import { getListingFull } from "@/server/listings/queries";
import { PROVIDER_LABELS, providerSummaries } from "@/server/images/providers";
import { MAX_PHOTOS_PER_LISTING } from "@/server/images/process";
import { PhotoManager } from "@/components/app/photo-manager";
import { StepHeader } from "@/components/app/step-footer";
import { LinkButton } from "@/components/ui/button";
import { stepHref } from "@/lib/listing/steps";

export const metadata = { title: "Φωτογραφίες" };

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireListingAccess(id, "read");
  const l = await getListingFull(id);
  if (!l) notFound();
  const photos = l.photos.map((p) => ({
    id: p.id,
    room: p.room,
    roomLabel: p.roomLabel,
    caption: p.caption,
    includeInListing: p.includeInListing,
    isCover: p.isCover,
    width: p.width,
    height: p.height,
    originalFilename: p.originalFilename,
    selectedVariantId: p.selectedVariantId,
    variants: p.variants.map((v) => ({
      id: v.id,
      kind: v.kind,
      status: v.status,
      provider: v.provider,
      providerLabel: PROVIDER_LABELS[v.provider] ?? v.provider,
      errorMessage: v.errorMessage,
      approvedAt: v.approvedAt?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
      attempts: v.attempts,
    })),
  }));
  return (
    <>
      <StepHeader n={3} title="Φωτογραφίες">
        Ανεβάστε τις φωτογραφίες σας, ορίστε τη σειρά, αντιστοιχίστε κάθε μία σε χώρο και επιλέξτε εξώφυλλο. Οι αλλαγές αποθηκεύονται
        αμέσως. Οι δημόσιες εκδόσεις δεν περιέχουν μεταδεδομένα (π.χ. τοποθεσία λήψης).
      </StepHeader>
      <PhotoManager listingId={id} photos={photos} providers={providerSummaries()} maxPhotos={MAX_PHOTOS_PER_LISTING} />
      <div className="mt-8 flex justify-between">
        <Link href={stepHref(id, "details")} className="text-sm text-ink-muted hover:text-ink">← Χαρακτηριστικά</Link>
        <LinkButton href={stepHref(id, "floor-plan")}>Συνέχεια: Κάτοψη</LinkButton>
      </div>
    </>
  );
}
