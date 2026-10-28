import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { msAgo } from "@/lib/time";
import { integrationStatus, env } from "@/server/env";
import { Badge, Card } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/listing/format";
import { LISTING_STATUSES, labelOf } from "@/lib/listing/options";

export default async function AdminHome() {
  await requireAdmin();
  const [byStatus, newRequests, users, jobs, failedJobs24h, enquiries7d] = await Promise.all([
    db.listing.groupBy({ by: ["status"], _count: true }),
    db.contactRequest.count({ where: { status: "NEW" } }),
    db.user.count(),
    db.aiJob.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { listing: { select: { reference: true, id: true } } } }),
    db.aiJob.count({ where: { status: "FAILED", createdAt: { gt: msAgo(86_400_000) } } }),
    db.enquiry.count({ where: { createdAt: { gt: msAgo(7 * 86_400_000) } } }),
  ]);
  const st = integrationStatus();
  const integrations = [
    ["Βάση δεδομένων", st.database ? "Συνδεδεμένη" : "Λείπει DATABASE_URL", st.database],
    ["Αποθήκευση αρχείων", st.storage === "local" ? `Τοπικός δίσκος (${env.storageLocalDir})` : st.storage === "s3" ? "S3-compatible" : "S3 χωρίς πλήρη ρύθμιση", st.storage !== "s3-misconfigured"],
    ["Κείμενα AI (Anthropic)", st.aiText ?? "Δεν έχει ρυθμιστεί", Boolean(st.aiText)],
    ["Βελτίωση φωτογραφιών (Claid)", st.photoEnhancement ?? "Δεν έχει ρυθμιστεί", Boolean(st.photoEnhancement)],
    ["Ψηφιακή επίπλωση", "Μόνο χειροκίνητη μεταφόρτωση", false],
    ["Email (Resend)", st.email ?? "Δεν έχει ρυθμιστεί", Boolean(st.email)],
    ["APP_SECRET", st.appSecret ? "Ορισμένο" : "ΛΕΙΠΕΙ — απαραίτητο για παραγωγή", st.appSecret],
  ] as const;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Επισκόπηση</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LISTING_STATUSES.map((s) => (
          <Link key={s.value} href={`/admin/listings?status=${s.value}`}>
            <Card className="p-5 hover:border-stone-400">
              <p className="text-sm text-ink-muted">{s.el}</p>
              <p className="font-display text-3xl">{byStatus.find((b) => b.status === s.value)?._count ?? 0}</p>
            </Card>
          </Link>
        ))}
        <Link href="/admin/requests">
          <Card className="p-5 hover:border-stone-400">
            <p className="text-sm text-ink-muted">Νέα αιτήματα</p>
            <p className="font-display text-3xl">{newRequests}</p>
          </Card>
        </Link>
        <Card className="p-5">
          <p className="text-sm text-ink-muted">Χρήστες</p>
          <p className="font-display text-3xl">{users}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-ink-muted">Μηνύματα ενδιαφερομένων (7 ημέρες)</p>
          <p className="font-display text-3xl">{enquiries7d}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Υπηρεσίες και ρυθμίσεις</h2>
        <ul className="mt-3 divide-y divide-stone-200 text-sm">
          {integrations.map(([name, value, ok]) => (
            <li key={name} className="flex flex-wrap justify-between gap-2 py-2.5">
              <span className="font-medium">{name}</span>
              <span className={ok ? "text-olive-700" : "text-ink-muted"}>{value}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Πρόσφατες επεξεργασίες AI / εικόνων</h2>
          {failedJobs24h > 0 && <Badge tone="danger">{failedJobs24h} αποτυχίες (24ω)</Badge>}
        </div>
        <p className="mt-1 text-xs text-ink-muted">Καταγράφεται μόνο πάροχος, μοντέλο, κατάσταση, κωδικός σφάλματος και διάρκεια — ποτέ περιεχόμενο.</p>
        {jobs.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Δεν έχουν γίνει ακόμη επεξεργασίες.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-ink-muted">
                <tr>
                  <th className="py-2 pr-4">Χρόνος</th>
                  <th className="py-2 pr-4">Είδος</th>
                  <th className="py-2 pr-4">Πάροχος</th>
                  <th className="py-2 pr-4">Κατάσταση</th>
                  <th className="py-2 pr-4">Διάρκεια</th>
                  <th className="py-2">Αγγελία</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(j.createdAt)}</td>
                    <td className="py-2 pr-4">{j.kind === "TEXT_GENERATION" ? "Κείμενα" : "Φωτογραφία"}</td>
                    <td className="py-2 pr-4">{j.provider}{j.model ? ` · ${j.model}` : ""}</td>
                    <td className="py-2 pr-4">
                      {j.status === "SUCCEEDED" ? <Badge tone="success">OK</Badge> : <Badge tone="danger">{j.errorCode ?? "FAILED"}</Badge>}
                    </td>
                    <td className="py-2 pr-4">{j.durationMs ? `${(j.durationMs / 1000).toFixed(1)}s` : "—"}</td>
                    <td className="py-2">{j.listing ? <Link className="hover:underline" href={`/admin/listings?q=${j.listing.reference}`}>{j.listing.reference}</Link> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-ink-muted">Κατάσταση αγγελιών: {LISTING_STATUSES.map((s) => `${labelOf(LISTING_STATUSES, s.value)}`).join(" → ")}</p>
    </div>
  );
}
