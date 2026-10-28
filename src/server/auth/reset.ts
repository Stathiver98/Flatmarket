import "server-only";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { randomToken, sha256 } from "@/server/security/crypto";

// NOTE: deliberately NOT in a "use server" file — exports there become
// client-callable endpoints. Only call this after an authorization check.
export async function createPasswordResetLink(userId: string) {
  const token = randomToken(32);
  await db.passwordResetToken.create({
    data: { id: sha256(token), userId, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  return `${env.appUrl}/reset-password?token=${token}`;
}
