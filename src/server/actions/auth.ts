"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { env, isEmailConfigured } from "@/server/env";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/server/auth/password";
import { createSession, destroyAllSessionsForUser, destroySession } from "@/server/auth/session";
import { hashIp, sha256 } from "@/server/security/crypto";
import { createPasswordResetLink } from "@/server/auth/reset";
import { getClientIp } from "@/server/security/request";
import { rateLimit } from "@/server/security/rate-limit";
import { sendEmail } from "@/server/email";
import { logger } from "@/server/logger";

export type AuthState = { ok?: boolean; error?: string | null; message?: string | null; fieldErrors?: Record<string, string> } | null;

/** Only allow same-site relative redirects (prevents open redirects). */
function safeNext(next: unknown, fallback = "/app") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Συμπληρώστε το όνομά σας.").max(120),
    email: z.string().trim().toLowerCase().email("Συμπληρώστε έγκυρο email.").max(200),
    password: z.string().max(200),
    accountType: z.enum(["INDIVIDUAL", "AGENCY"]),
    agencyName: z.string().trim().max(160).optional(),
    terms: z.literal("on", { message: "Πρέπει να αποδεχτείτε τους όρους χρήσης." }),
  })
  .superRefine((v, ctx) => {
    const pw = validatePasswordStrength(v.password);
    if (pw) ctx.addIssue({ code: "custom", path: ["password"], message: pw });
    if (v.accountType === "AGENCY" && (!v.agencyName || v.agencyName.length < 2)) {
      ctx.addIssue({ code: "custom", path: ["agencyName"], message: "Συμπληρώστε την επωνυμία του γραφείου." });
    }
  });

function fieldErrorsOf(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

export async function signup(_prev: AuthState, fd: FormData): Promise<AuthState> {
  if (env.signupMode === "closed") {
    return { error: "Η δημιουργία νέων λογαριασμών δεν είναι ανοιχτή αυτή τη στιγμή. Επικοινωνήστε μαζί μας για πρόσβαση." };
  }
  const ipHash = hashIp(await getClientIp());
  if (!(await rateLimit(`signup:${ipHash}`, 10, 3600))) {
    return { error: "Πολλές προσπάθειες δημιουργίας λογαριασμού. Δοκιμάστε ξανά αργότερα." };
  }
  const parsed = signupSchema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    password: fd.get("password") ?? "",
    accountType: fd.get("accountType") ?? "INDIVIDUAL",
    agencyName: (fd.get("agencyName") as string) || undefined,
    terms: fd.get("terms") ?? undefined,
  });
  if (!parsed.success) return { error: "Ελέγξτε τα στοιχεία της φόρμας.", fieldErrors: fieldErrorsOf(parsed.error) };
  const v = parsed.data;

  const existing = await db.user.findUnique({ where: { email: v.email } });
  if (existing) {
    return { error: "Υπάρχει ήδη λογαριασμός με αυτό το email. Συνδεθείτε ή επαναφέρετε τον κωδικό σας.", fieldErrors: { email: "Το email χρησιμοποιείται ήδη." } };
  }

  const passwordHash = await hashPassword(v.password);
  const isAdmin = env.adminEmails.includes(v.email);
  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { name: v.name, email: v.email, passwordHash, role: isAdmin ? "ADMIN" : "USER", lastLoginAt: new Date() },
    });
    const wsName = v.accountType === "AGENCY" ? v.agencyName! : v.name;
    await tx.workspace.create({
      data: {
        type: v.accountType,
        name: wsName,
        displayName: wsName,
        contactName: v.name,
        contactEmail: v.email,
        memberships: { create: { userId: u.id, role: "OWNER" } },
      },
    });
    return u;
  });
  logger.info("auth.signup", { userId: user.id, accountType: v.accountType });
  await createSession(user.id);
  redirect(safeNext(fd.get("next"), "/app?welcome=1"));
}

export async function login(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Συμπληρώστε email και κωδικό." };

  const ipHash = hashIp(await getClientIp());
  const allowedIp = await rateLimit(`login-ip:${ipHash}`, 30, 900);
  const allowedAccount = await rateLimit(`login-acct:${sha256(email)}`, 10, 900);
  if (!allowedIp || !allowedAccount) {
    return { error: "Πολλές αποτυχημένες προσπάθειες. Περιμένετε 15 λεπτά και δοκιμάστε ξανά." };
  }

  const user = await db.user.findUnique({ where: { email } });
  // Always run a hash comparison to keep response times similar.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==");
  if (!user || !ok) return { error: "Λάθος email ή κωδικός." };

  const promote = env.adminEmails.includes(user.email) && user.role !== "ADMIN";
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), ...(promote ? { role: "ADMIN" } : {}) } });
  await createSession(user.id);
  logger.info("auth.login", { userId: user.id });
  redirect(safeNext(fd.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordReset(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "Συμπληρώστε έγκυρο email." };
  if (!isEmailConfigured()) {
    return {
      error:
        "Η αποστολή email δεν έχει ενεργοποιηθεί σε αυτή την εγκατάσταση, οπότε δεν μπορούμε να σας στείλουμε σύνδεσμο. Επικοινωνήστε με τον διαχειριστή για να σας δώσει σύνδεσμο επαναφοράς.",
    };
  }
  const ipHash = hashIp(await getClientIp());
  if (!(await rateLimit(`reset:${ipHash}`, 5, 3600))) {
    return { error: "Πολλές προσπάθειες. Δοκιμάστε ξανά αργότερα." };
  }
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const link = await createPasswordResetLink(user.id);
    const result = await sendEmail({
      to: user.email,
      subject: "Επαναφορά κωδικού Flatmarket",
      text: `Γεια σας ${user.name},\n\nΓια να ορίσετε νέο κωδικό, ανοίξτε τον παρακάτω σύνδεσμο (ισχύει για 1 ώρα):\n${link}\n\nΑν δεν ζητήσατε εσείς την επαναφορά, αγνοήστε αυτό το μήνυμα.`,
    });
    if (result.status !== "SENT") {
      return { error: "Η αποστολή του email απέτυχε. Δοκιμάστε ξανά αργότερα." };
    }
  }
  // Same response whether or not the account exists (no account enumeration).
  return { ok: true, message: "Αν υπάρχει λογαριασμός με αυτό το email, θα λάβετε σύντομα σύνδεσμο επαναφοράς." };
}

export async function resetPassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const pwError = validatePasswordStrength(password);
  if (pwError) return { error: pwError, fieldErrors: { password: pwError } };
  const row = await db.passwordResetToken.findUnique({ where: { id: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return { error: "Ο σύνδεσμος επαναφοράς δεν είναι έγκυρος ή έχει λήξει. Ζητήστε νέο." };
  }
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  await destroyAllSessionsForUser(row.userId);
  logger.info("auth.password_reset", { userId: row.userId });
  return { ok: true, message: "Ο κωδικός άλλαξε. Μπορείτε τώρα να συνδεθείτε." };
}
