import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireListingAccess } from "@/server/auth/guards";
import { BasicsForm } from "@/components/app/basics-form";
import { StepHeader } from "@/components/app/step-footer";

export const metadata = { title: "Βασικά στοιχεία" };

export default async function BasicsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireListingAccess(id, "read");
  const l = await db.listing.findUnique({ where: { id } });
  if (!l) notFound();
  return (
    <>
      <StepHeader n={1} title="Βασικά στοιχεία">
        Τα στοιχεία που χρειάζεται κάθε αγγελία. Μπορείτε να αποθηκεύσετε και να συνεχίσετε αργότερα.
      </StepHeader>
      <BasicsForm
        listingId={id}
        v={{
          purpose: l.purpose,
          propertyType: l.propertyType,
          title: l.title,
          region: l.region,
          municipality: l.municipality,
          neighborhood: l.neighborhood,
          address: l.address,
          postalCode: l.postalCode,
          locationPrecision: l.locationPrecision,
          price: l.price,
          priceOnRequest: l.priceOnRequest,
          areaSqm: l.areaSqm,
          bedrooms: l.bedrooms,
          bathrooms: l.bathrooms,
          floor: l.floor,
          availability: l.availability,
          availableFrom: l.availableFrom ? l.availableFrom.toISOString().slice(0, 10) : null,
        }}
      />
    </>
  );
}
