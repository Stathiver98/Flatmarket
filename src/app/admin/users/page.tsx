import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/guards";
import { ResetLinkButton } from "@/components/app/admin-forms";
import { Badge } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/listing/format";
import { isEmailConfigured } from "@/server/env";

export const metadata = { title: "Χρήστες" };

export default async function AdminUsers() {
  await requireAdmin();
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      memberships: { select: { role: true, workspace: { select: { displayName: true, type: true } } } },
      _count: { select: { listingsCreated: true } },
    },
  });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Χρήστες</h1>
      {!isEmailConfigured() && (
        <p className="text-sm text-ink-muted">
          Η αποστολή email δεν έχει ρυθμιστεί: αν κάποιος χρήστης ξεχάσει τον κωδικό του, δημιουργήστε σύνδεσμο επαναφοράς και στείλτε τον
          σε εκείνον, αφού επιβεβαιώσετε την ταυτότητά του.
        </p>
      )}
      <ul className="divide-y divide-stone-200 rounded-[var(--radius-card)] border border-stone-200 bg-paper">
        {users.map((u) => (
          <li key={u.id} className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_auto]">
            <div>
              <p className="font-medium">
                {u.name} <span className="font-normal text-ink-muted">{u.email}</span> {u.role === "ADMIN" && <Badge tone="accent">Διαχειριστής</Badge>}
              </p>
              <p className="text-xs text-ink-muted">
                Εγγραφή {formatDateTime(u.createdAt)} · Τελευταία σύνδεση {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"} · {u._count.listingsCreated} αγγελίες
              </p>
              <p className="text-xs text-ink-muted">
                {u.memberships.map((m) => `${m.workspace.displayName} (${m.workspace.type === "AGENCY" ? "γραφείο" : "ατομικός"}, ${m.role === "OWNER" ? "διαχειριστής" : "μέλος"})`).join(" · ")}
              </p>
            </div>
            <ResetLinkButton userId={u.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
