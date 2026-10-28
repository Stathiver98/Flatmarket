import { db } from "@/server/db";
import { requireUser, getUserWorkspaces } from "@/server/auth/guards";
import { InviteForm, MemberActions } from "@/components/app/settings-forms";
import { Badge, Card, EmptyState } from "@/components/ui/feedback";
import { formatDateTime } from "@/lib/listing/format";

export const metadata = { title: "Ομάδα" };

export default async function TeamPage() {
  const user = await requireUser("/app/team");
  const agencies = (await getUserWorkspaces(user.id)).filter((w) => w.type === "AGENCY");
  if (agencies.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <EmptyState title="Η ομάδα αφορά λογαριασμούς γραφείων">Οι ατομικοί λογαριασμοί δεν έχουν μέλη ομάδας.</EmptyState>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl text-ink">Ομάδα</h1>
      {await Promise.all(
        agencies.map(async (w) => {
          const [members, invites] = await Promise.all([
            db.membership.findMany({ where: { workspaceId: w.id }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } }),
            db.invitation.findMany({ where: { workspaceId: w.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
          ]);
          const isOwner = w.role === "OWNER";
          return (
            <Card key={w.id} className="p-6">
              <h2 className="text-lg font-semibold">{w.displayName}</h2>
              <ul className="mt-4 divide-y divide-stone-200 text-sm">
                {members.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span>
                      <span className="font-medium">{m.user.name}</span> <span className="text-ink-muted">{m.user.email}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <Badge tone={m.role === "OWNER" ? "accent" : "neutral"}>{m.role === "OWNER" ? "Διαχειριστής" : "Μέλος"}</Badge>
                      {isOwner && m.role !== "OWNER" && <MemberActions kind="member" id={m.id} />}
                    </span>
                  </li>
                ))}
              </ul>
              {isOwner && (
                <>
                  {invites.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold">Εκκρεμείς προσκλήσεις</h3>
                      <ul className="mt-2 divide-y divide-stone-200 text-sm">
                        {invites.map((i) => (
                          <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                            <span>{i.email}</span>
                            <span className="flex items-center gap-3 text-xs text-ink-muted">
                              Λήγει {formatDateTime(i.expiresAt)}
                              <MemberActions kind="invite" id={i.id} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-6">
                    <h3 className="mb-2 text-sm font-semibold">Πρόσκληση συνεργάτη</h3>
                    <InviteForm workspaceId={w.id} />
                  </div>
                </>
              )}
            </Card>
          );
        }),
      )}
    </div>
  );
}
