import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { AdminListingForm } from "@/components/app/admin-forms";
import { Badge, StatusBadge } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { defaultTitle, formatDateTime } from "@/lib/listing/format";
import { LISTING_STATUSES } from "@/lib/listing/options";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Αγγελίες" };

export default async function AdminListings({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const statuses = LISTING_STATUSES.map((s) => s.value) as string[];
  const status = statuses.includes(sp.status ?? "") ? (sp.status as Prisma.ListingWhereInput["status"]) : undefined;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const listings = await db.listing.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { reference: { contains: q, mode: "insensitive" } },
              { workspace: { displayName: { contains: q, mode: "insensitive" } } },
              { createdBy: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      workspace: { select: { displayName: true, type: true, contactEmail: true, contactPhone: true } },
      createdBy: { select: { name: true, email: true } },
      _count: { select: { photos: true, floorPlans: true, enquiries: true } },
      content: { where: { approved: true }, select: { key: true, lang: true } },
      aiJobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, kind: true, errorCode: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Αγγελίες</h1>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/listings" className={`rounded-full border px-3 py-1.5 text-sm ${!status ? "border-ink bg-ink text-paper" : "border-stone-300"}`}>Όλες</Link>
        {LISTING_STATUSES.map((s) => (
          <Link key={s.value} href={`/admin/listings?status=${s.value}`} className={`rounded-full border px-3 py-1.5 text-sm ${status === s.value ? "border-ink bg-ink text-paper" : "border-stone-300"}`}>
            {s.el}
          </Link>
        ))}
      </div>
      <form className="max-w-md">
        {status && <input type="hidden" name="status" value={String(status)} />}
        <Input name="q" defaultValue={q} placeholder="Κωδικός, γραφείο ή email πελάτη" aria-label="Αναζήτηση" />
      </form>
      <ul className="space-y-3">
        {listings.map((l) => (
          <li key={l.id} className="grid gap-4 rounded-[var(--radius-card)] border border-stone-200 bg-paper p-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={l.status} />
                {l.status === "PUBLISHED" && <Badge>{l.visibility === "PUBLIC" ? "Δημόσια" : "Μόνο με σύνδεσμο"}</Badge>}
                <span className="font-medium">{l.reference}</span>
                <span className="text-ink-muted">ενημ. {formatDateTime(l.updatedAt)}</span>
              </div>
              <p className="mt-2 font-display text-xl">{l.title ?? defaultTitle(l, "el")}</p>
              <p className="mt-1 text-ink-soft">
                {l.workspace.displayName} ({l.workspace.type === "AGENCY" ? "γραφείο" : "ατομικός"}) · {l.createdBy.name} &lt;{l.createdBy.email}&gt;
              </p>
              <p className="mt-1 text-ink-muted">
                {l._count.photos} φωτογραφίες · {l._count.floorPlans} κατόψεις · {l.content.length} εγκεκριμένα κείμενα · {l._count.enquiries} μηνύματα
              </p>
              {l.aiJobs[0] && (
                <p className="mt-1 text-xs text-ink-muted">
                  Τελευταία επεξεργασία: {l.aiJobs[0].kind === "TEXT_GENERATION" ? "κείμενα" : "φωτογραφία"} —{" "}
                  {l.aiJobs[0].status === "SUCCEEDED" ? "επιτυχής" : `απέτυχε (${l.aiJobs[0].errorCode})`}
                </p>
              )}
              <div className="mt-3 flex gap-3">
                <Link href={`/app/listings/${l.id}`} className="text-terracotta-700 hover:underline">Προβολή αγγελίας & αρχείων</Link>
                <Link href={`/preview/${l.id}`} className="text-terracotta-700 hover:underline">Προεπισκόπηση</Link>
              </div>
            </div>
            <AdminListingForm listingId={l.id} status={l.status} notes={l.adminNotes} />
          </li>
        ))}
        {listings.length === 0 && <li className="text-sm text-ink-muted">Δεν βρέθηκαν αγγελίες.</li>}
      </ul>
    </div>
  );
}
