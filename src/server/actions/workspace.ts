"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { env, isEmailConfigured } from "@/server/env";
import { getCurrentUser } from "@/server/auth/session";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/server/auth/password";
import { randomToken, sha256 } from "@/server/security/crypto";
import { rateLimit } from "@/server/security/rate-limit";
import { sendEmail } from "@/server/email";
import { logger } from "@/server/logger";
import { ActionError, guarded, type ActionState } from "./_shared";

async function requireOwner(workspaceId: string) {
  const user = await getCurrentUser();
  if (!user) throw new ActionError("Η σύνδεσή σας έληξε.");
  const m = await db.membership.findUnique({ where: { workspaceId_userId: { workspaceId, userId: user.id } } });
  if (!m || m.role !== "OWNER") throw new ActionError("Μόνο ο διαχειριστής του χώρου εργασίας μπορεί να κάνει αυτή την αλλαγή.");
  return user;
}

const brandingSchema = z.object({
  displayName: z.string().trim().min(2, "Συμπληρώστε επωνυμία.").max(120),
  contactName: z.string().trim().max(120).nullable(),
  contactEmail: z.string().trim().toLowerCase().email("Μη έγκυρο email.").max(200).nullable(),
  contactPhone: z.string().trim().regex(/^[+0-9 ()-]{6,25}$/, "Μη έγκυρος αριθμός.").nullable(),
  website: z.string().trim().url("Μη έγκυρη διεύθυνση (π.χ. https://…).").max(200).refine((u) => u.startsWith("https://") || u.startsWith("http://"), "Μη έγκυρη διεύθυνση.").nullable(),
  registryNumber: z.string().trim().max(80).nullable(),
});

export async function saveBranding(workspaceId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await requireOwner(workspaceId);
    const v = (k: string) => {
      const x = fd.get(k);
      return typeof x === "string" && x.trim() ? x.trim() : null;
    };
    const parsed = brandingSchema.safeParse({
      displayName: v("displayName") ?? "",
      contactName: v("contactName"),
      contactEmail: v("contactEmail"),
      contactPhone: v("contactPhone"),
      website: v("website"),
      registryNumber: v("registryNumber"),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
      return { ok: false, error: "Ελέγξτε τα πεδία.", fieldErrors };
    }
    await db.workspace.update({ where: { id: workspaceId }, data: parsed.data });
    revalidatePath("/app/settings");
    return {
      ok: true,
      message: "Τα στοιχεία αποθηκεύτηκαν. Νέες αγγελίες θα τα χρησιμοποιούν ως προεπιλογή· οι δημοσιευμένες σελίδες ενημερώνονται με την επόμενη δημοσίευση.",
    };
  });
}

export async function removeLogo(workspaceId: string): Promise<ActionState> {
  return guarded(async () => {
    await requireOwner(workspaceId);
    await db.workspace.update({ where: { id: workspaceId }, data: { logoKey: null } });
    revalidatePath("/app/settings");
    return { ok: true };
  });
}

export async function saveProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Η σύνδεσή σας έληξε.");
    const name = String(fd.get("name") ?? "").trim();
    if (name.length < 2 || name.length > 120) return { ok: false, error: "Συμπληρώστε έγκυρο όνομα." };
    await db.user.update({ where: { id: user.id }, data: { name } });
    revalidatePath("/app", "layout");
    return { ok: true, message: "Το προφίλ αποθηκεύτηκε." };
  });
}

export async function changePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Η σύνδεσή σας έληξε.");
    if (!(await rateLimit(`pwchange:${user.id}`, 10, 3600))) return { ok: false, error: "Πολλές προσπάθειες. Δοκιμάστε αργότερα." };
    const current = String(fd.get("currentPassword") ?? "");
    const next = String(fd.get("newPassword") ?? "");
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(current, row.passwordHash))) return { ok: false, error: "Ο τρέχων κωδικός δεν είναι σωστός." };
    const err = validatePasswordStrength(next);
    if (err) return { ok: false, error: err };
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
    // Sign out other devices; keep this session.
    const { cookies } = await import("next/headers");
    const token = (await cookies()).get("fm_session")?.value;
    await db.session.deleteMany({ where: { userId: user.id, NOT: token ? { id: sha256(token) } : undefined } });
    return { ok: true, message: "Ο κωδικός άλλαξε. Οι συνδέσεις σε άλλες συσκευές τερματίστηκαν." };
  });
}

// ---------------------------------------------------------------------------
// Team invitations (agency workspaces)
// ---------------------------------------------------------------------------

export type InviteState = (ActionState & { link?: string; emailed?: boolean }) | null;

export async function inviteMember(workspaceId: string, _prev: InviteState, fd: FormData): Promise<InviteState> {
  return guarded(async () => {
    const user = await requireOwner(workspaceId);
    const ws = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    if (ws.type !== "AGENCY") throw new ActionError("Οι προσκλήσεις είναι διαθέσιμες μόνο για χώρους εργασίας γραφείων.");
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    if (!z.string().email().safeParse(email).success) return { ok: false, error: "Συμπληρώστε έγκυρο email." };
    if (!(await rateLimit(`invite:${user.id}`, 30, 86400))) return { ok: false, error: "Πολλές προσκλήσεις σήμερα. Δοκιμάστε αύριο." };
    const existing = await db.membership.findFirst({ where: { workspaceId, user: { email } } });
    if (existing) return { ok: false, error: "Ο χρήστης είναι ήδη μέλος." };
    const memberCount = await db.membership.count({ where: { workspaceId } });
    if (memberCount >= 25) return { ok: false, error: "Έχετε φτάσει το όριο των 25 μελών." };

    const token = randomToken(32);
    await db.invitation.updateMany({ where: { workspaceId, email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    await db.invitation.create({
      data: { workspaceId, email, tokenHash: sha256(token), invitedById: user.id, expiresAt: new Date(Date.now() + 7 * 86_400_000) },
    });
    const link = `${env.appUrl}/invite/${token}`;
    let emailed = false;
    if (isEmailConfigured()) {
      const r = await sendEmail({
        to: email,
        subject: `Πρόσκληση στο Flatmarket από ${ws.displayName}`,
        text: `Ο/Η ${user.name} σας προσκάλεσε να συμμετάσχετε στον χώρο εργασίας «${ws.displayName}» στο Flatmarket.\n\nΑποδοχή πρόσκλησης (ισχύει 7 ημέρες):\n${link}\n`,
      });
      emailed = r.status === "SENT";
    }
    logger.info("team.invited", { workspaceId, emailed });
    revalidatePath("/app/team");
    return {
      ok: true,
      link,
      emailed,
      message: emailed
        ? "Η πρόσκληση στάλθηκε με email. Μπορείτε επίσης να μοιραστείτε τον σύνδεσμο."
        : "Η πρόσκληση δημιουργήθηκε. Η αποστολή email δεν έχει ρυθμιστεί — στείλτε τον σύνδεσμο στον συνεργάτη σας με ασφαλή τρόπο.",
    };
  });
}

export async function revokeInvitation(invitationId: string): Promise<ActionState> {
  return guarded(async () => {
    const inv = await db.invitation.findUnique({ where: { id: invitationId } });
    if (!inv) throw new ActionError("Η πρόσκληση δεν βρέθηκε.");
    await requireOwner(inv.workspaceId);
    await db.invitation.update({ where: { id: invitationId }, data: { revokedAt: new Date() } });
    revalidatePath("/app/team");
    return { ok: true };
  });
}

export async function removeMember(membershipId: string): Promise<ActionState> {
  return guarded(async () => {
    const m = await db.membership.findUnique({ where: { id: membershipId } });
    if (!m) throw new ActionError("Το μέλος δεν βρέθηκε.");
    const owner = await requireOwner(m.workspaceId);
    if (m.userId === owner.id) throw new ActionError("Δεν μπορείτε να αφαιρέσετε τον εαυτό σας.");
    if (m.role === "OWNER") throw new ActionError("Δεν μπορείτε να αφαιρέσετε διαχειριστή.");
    await db.membership.delete({ where: { id: membershipId } });
    revalidatePath("/app/team");
    return { ok: true, message: "Το μέλος αφαιρέθηκε και δεν έχει πλέον πρόσβαση στις αγγελίες του γραφείου." };
  });
}

export async function acceptInvitation(token: string): Promise<ActionState> {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Συνδεθείτε για να αποδεχτείτε την πρόσκληση.");
    const inv = await db.invitation.findUnique({ where: { tokenHash: sha256(token) } });
    if (!inv || inv.revokedAt || inv.acceptedAt || inv.expiresAt.getTime() < Date.now()) {
      throw new ActionError("Η πρόσκληση δεν είναι έγκυρη ή έχει λήξει.");
    }
    if (inv.email !== user.email) {
      throw new ActionError(`Η πρόσκληση αφορά το email ${inv.email}. Συνδεθείτε με αυτόν τον λογαριασμό.`);
    }
    await db.$transaction([
      db.membership.upsert({
        where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId: user.id } },
        create: { workspaceId: inv.workspaceId, userId: user.id, role: "MEMBER" },
        update: {},
      }),
      db.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
    ]);
    revalidatePath("/app", "layout");
    return { ok: true, message: "Γίνατε μέλος του χώρου εργασίας." };
  });
}

export async function markEnquiryRead(enquiryId: string, read: boolean): Promise<ActionState> {
  return guarded(async () => {
    const user = await getCurrentUser();
    if (!user) throw new ActionError("Η σύνδεσή σας έληξε.");
    const e = await db.enquiry.findUnique({ where: { id: enquiryId }, include: { listing: { select: { workspaceId: true } } } });
    if (!e) throw new ActionError("Το μήνυμα δεν βρέθηκε.");
    const m = await db.membership.findUnique({ where: { workspaceId_userId: { workspaceId: e.listing.workspaceId, userId: user.id } } });
    if (!m) throw new ActionError("Δεν έχετε πρόσβαση.");
    await db.enquiry.update({ where: { id: enquiryId }, data: { readAt: read ? new Date() : null } });
    revalidatePath("/app/enquiries");
    return { ok: true };
  });
}
