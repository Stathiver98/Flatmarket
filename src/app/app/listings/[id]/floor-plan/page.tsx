import Link from "next/link";
import { notFound } from "next/navigation";
import { requireListingAccess } from "@/server/auth/guards";
import { getListingFull } from "@/server/listings/queries";
import { StepHeader } from "@/components/app/step-footer";
import { FloorPlanEditor } from "@/components/app/floor-plan-editor";
import { Uploader } from "@/components/app/uploader";
import { Alert } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { stepHref } from "@/lib/listing/steps";
import { roomLabel } from "@/lib/listing/presentation";

export const metadata = { title: "Κάτοψη" };

export default async function FloorPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireListingAccess(id, "read");
  const l = await getListingFull(id);
  if (!l) notFound();
  const rooms: { room: string; roomLabel: string | null; label: string; photoCount: number }[] = [];
  for (const p of l.photos.filter((x) => x.includeInListing && x.room)) {
    const r = rooms.find((x) => x.room === p.room && x.roomLabel === p.roomLabel);
    if (r) r.photoCount++;
    else rooms.push({ room: p.room!, roomLabel: p.roomLabel, label: roomLabel(p.room, p.roomLabel, "el"), photoCount: 1 });
  }
  return (
    <>
      <StepHeader n={4} title="Κάτοψη (προαιρετικά)">
        Αν έχετε κάτοψη, ανεβάστε τη ως εικόνα (JPEG, PNG ή WebP). Δεν σχεδιάζουμε, δεν μετράμε και δεν μαντεύουμε σχήματα ή συνδέσεις
        χώρων — εμφανίζουμε την κάτοψή σας όπως είναι, με τα σημεία που τοποθετείτε εσείς.
      </StepHeader>
      <div className="space-y-6">
        <Uploader
          endpoint={`/api/listings/${id}/floor-plans`}
          label="Σύρετε την κάτοψη εδώ ή επιλέξτε αρχείο"
          hint="Αν η κάτοψη είναι PDF, αποθηκεύστε την πρώτα ως εικόνα. Έως 6 κατόψεις (π.χ. μία ανά επίπεδο)."
        />
        {l.floorPlans.length === 0 ? (
          <Alert tone="neutral">
            Δεν έχετε ανεβάσει κάτοψη. Δεν πειράζει: η σελίδα παρουσίασης θα εμφανίζει τις φωτογραφίες οργανωμένες ανά χώρο.
          </Alert>
        ) : (
          l.floorPlans.map((f) => (
            <FloorPlanEditor
              key={f.id}
              plan={{ id: f.id, label: f.label, width: f.width, height: f.height, hotspots: f.hotspots.map((h) => ({ id: h.id, x: h.x, y: h.y, room: h.room, roomLabel: h.roomLabel })) }}
              rooms={rooms}
            />
          ))
        )}
      </div>
      <div className="mt-8 flex justify-between">
        <Link href={stepHref(id, "photos")} className="text-sm text-ink-muted hover:text-ink">← Φωτογραφίες</Link>
        <LinkButton href={stepHref(id, "completeness")}>Συνέχεια: Πληρότητα</LinkButton>
      </div>
    </>
  );
}
