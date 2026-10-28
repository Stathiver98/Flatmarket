import Link from "next/link";
import { db } from "@/server/db";
import { requireUser, getWorkspaceIdsForUser } from "@/server/auth/guards";
import { EnquiryReadToggle } from "@/components/app/enquiry-read-toggle";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/listing/format";

export const metadata = { title: "Μηνύματα" };

const DELIVERY: Record<string, { label: string; tone: "success" | "neutral" | "danger" }> = {
  SENT: { label: "Στάλθηκε email", tone: "success" },
  NOT_CONFIGURED: { label: "Χωρίς email (δεν έχει ρυθμιστεί)", tone: "neutral" },
  FAILED: { label: "Αποτυχία αποστολής email", tone: "danger" },
};

export default async function EnquiriesPage() {
  const user = await requireUser("/app/enquiries");
  const wsIds = await getWorkspaceIdsForUser(user.id);
  const enquiries = await db.enquiry.findMany({
    where: { listing: { workspaceId: { in: wsIds } } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { listing: { select: { id: true, reference: true, title: true } } },
  });
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl text-ink">Μηνύματα ενδιαφερομένων</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Μηνύματα από τη φόρμα επικοινωνίας των δημοσιευμένων σελίδων σας. Αποθηκεύονται πάντα εδώ, ακόμη κι αν η αποστολή email δεν έχει ρυθμιστεί.
      </p>
      <div className="mt-8">
        {enquiries.length === 0 ? (
          <EmptyState title="Δεν υπάρχουν μηνύματα ακόμη">Όταν κάποιος επισκέπτης χρησιμοποιήσει τη φόρμα επικοινωνίας, το μήνυμα θα εμφανιστεί εδώ.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {enquiries.map((e) => {
              const d = DELIVERY[e.deliveryStatus];
              return (
                <li key={e.id} className={`rounded-[var(--radius-card)] border bg-paper p-5 ${e.readAt ? "border-stone-200" : "border-terracotta-500/50"}`}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {!e.readAt && <Badge tone="accent">Νέο</Badge>}
                    <span className="font-semibold">{e.name}</span>
                    <a href={`mailto:${e.email}?subject=${encodeURIComponent(e.listing.reference)}`} className="text-terracotta-700 hover:underline">
                      {e.email}
                    </a>
                    {e.phone && (
                      <a href={`tel:${e.phone.replace(/\s/g, "")}`} className="text-ink-soft hover:underline">
                        {e.phone}
                      </a>
                    )}
                    <span className="ml-auto text-xs text-ink-muted">{formatDateTime(e.createdAt)}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">{e.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    <Link href={`/app/listings/${e.listing.id}`} className="hover:underline">Αγγελία {e.listing.reference}</Link>
                    <Badge tone={d.tone}>{d.label}</Badge>
                    <EnquiryReadToggle id={e.id} read={Boolean(e.readAt)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
