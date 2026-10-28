import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { AdminRequestForm } from "@/components/app/admin-forms";
import { Badge } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/listing/format";

export const metadata = { title: "Αιτήματα" };

const KIND: Record<string, string> = {
  DEMO: "Παρουσίαση",
  PRICING: "Προσφορά",
  GENERAL: "Γενική ερώτηση",
  CAPTURE: "Επιτόπια λήψη",
  SERVICE: "Υπηρεσία",
};
const DELIVERY: Record<string, string> = { SENT: "Email στάλθηκε", NOT_CONFIGURED: "Χωρίς email", FAILED: "Αποτυχία email" };

export default async function AdminRequests() {
  await requireAdmin();
  const requests = await db.contactRequest.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Αιτήματα επικοινωνίας & υπηρεσιών</h1>
      {requests.length === 0 && <p className="text-sm text-ink-muted">Δεν υπάρχουν αιτήματα.</p>}
      <ul className="space-y-3">
        {requests.map((r) => (
          <li key={r.id} className="grid gap-4 rounded-[var(--radius-card)] border border-stone-200 bg-paper p-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.status === "NEW" ? "accent" : "neutral"}>{KIND[r.kind] ?? r.kind}</Badge>
                {r.packageName && <Badge>{r.packageName}</Badge>}
                <Badge tone={r.deliveryStatus === "FAILED" ? "danger" : "neutral"}>{DELIVERY[r.deliveryStatus]}</Badge>
                <span className="text-ink-muted">{formatDateTime(r.createdAt)}</span>
              </div>
              <p className="mt-2 font-medium">
                {r.name} · <a className="text-terracotta-700 hover:underline" href={`mailto:${r.email}`}>{r.email}</a>
                {r.phone && ` · ${r.phone}`}
                {r.company && ` · ${r.company}`}
              </p>
              <p className="mt-2 whitespace-pre-line text-ink-soft">{r.message}</p>
            </div>
            <AdminRequestForm id={r.id} status={r.status} notes={r.internalNotes} />
          </li>
        ))}
      </ul>
    </div>
  );
}
