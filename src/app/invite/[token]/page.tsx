import Link from "next/link";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { sha256 } from "@/server/security/crypto";
import { isPast } from "@/lib/time";
import { AcceptInviteButton } from "@/components/app/accept-invite-button";
import { Wordmark } from "@/components/ui/wordmark";
import { Alert } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Πρόσκληση", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = /^[A-Za-z0-9_-]{20,80}$/.test(token)
    ? await db.invitation.findUnique({ where: { tokenHash: sha256(token) }, include: { workspace: { select: { displayName: true } } } })
    : null;
  const valid = inv && !inv.revokedAt && !inv.acceptedAt && !isPast(inv.expiresAt);
  const user = await getCurrentUser();
  const next = `/invite/${token}`;
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <Wordmark className="mb-10 text-lg" />
      {!valid ? (
        <Alert tone="error" title="Η πρόσκληση δεν είναι έγκυρη">
          Ο σύνδεσμος έχει λήξει, έχει ακυρωθεί ή έχει ήδη χρησιμοποιηθεί. Ζητήστε νέα πρόσκληση από το γραφείο.
        </Alert>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-6">
          <h1 className="font-display text-3xl">Πρόσκληση στο «{inv.workspace.displayName}»</h1>
          <p className="mt-2 text-sm text-ink-soft">Η πρόσκληση αφορά το email <strong>{inv.email}</strong>.</p>
          <div className="mt-6">
            {!user ? (
              <div className="flex flex-wrap gap-2">
                <LinkButton href={`/signup?next=${encodeURIComponent(next)}&email=${encodeURIComponent(inv.email)}`}>Δημιουργία λογαριασμού</LinkButton>
                <LinkButton href={`/login?next=${encodeURIComponent(next)}`} variant="secondary">Έχω ήδη λογαριασμό</LinkButton>
              </div>
            ) : user.email !== inv.email ? (
              <Alert tone="warning">
                Έχετε συνδεθεί ως {user.email}. Αποσυνδεθείτε και συνδεθείτε με το {inv.email} για να αποδεχτείτε την πρόσκληση.
              </Alert>
            ) : (
              <AcceptInviteButton token={token} />
            )}
          </div>
        </div>
      )}
      <Link href="/" className="mt-8 text-sm text-ink-muted hover:text-ink">← Αρχική</Link>
    </div>
  );
}
