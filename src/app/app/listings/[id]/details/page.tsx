import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireListingAccess } from "@/server/auth/guards";
import { DetailsForm } from "@/components/app/details-form";
import { StepHeader } from "@/components/app/step-footer";
import { readDetails } from "@/lib/listing/schema";

export const metadata = { title: "Χαρακτηριστικά" };

export default async function DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireListingAccess(id, "read");
  const l = await db.listing.findUnique({ where: { id }, select: { details: true, propertyType: true, purpose: true } });
  if (!l) notFound();
  return (
    <>
      <StepHeader n={2} title="Χαρακτηριστικά του ακινήτου">
        Οι ερωτήσεις προσαρμόζονται στον τύπο του ακινήτου. Συμπληρώστε ό,τι γνωρίζετε με βεβαιότητα.
      </StepHeader>
      <DetailsForm listingId={id} d={readDetails(l.details)} propertyType={l.propertyType} purpose={l.purpose} />
    </>
  );
}
