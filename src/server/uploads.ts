import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getCurrentUser, type CurrentUser } from "@/server/auth/session";
import { checkListingAccess } from "@/server/auth/guards";
import { isSameOrigin } from "@/server/security/request";
import { rateLimit } from "@/server/security/rate-limit";
import { storage, storageKeys } from "@/server/storage";
import { ImageValidationError, MAX_UPLOAD_BYTES, makeDerivatives, validateImage } from "@/server/images/process";
import { markEdited } from "@/server/listings/mutations";
import { logger } from "@/server/logger";

export function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Common checks for authenticated multipart uploads. */
export async function readUpload(request: Request): Promise<{ user: CurrentUser; file: Buffer; filename: string; fields: FormData } | NextResponse> {
  if (!isSameOrigin(request)) return jsonError(403, "Μη επιτρεπτό αίτημα.");
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Η σύνδεσή σας έληξε. Συνδεθείτε ξανά.");
  const len = Number(request.headers.get("content-length") ?? "0");
  if (len > MAX_UPLOAD_BYTES + 512 * 1024) return jsonError(413, "Το αρχείο ξεπερνά το όριο των 20 MB.");
  if (!(await rateLimit(`upload:${user.id}`, 300, 3600))) {
    return jsonError(429, "Πολλές μεταφορτώσεις σε σύντομο χρόνο. Δοκιμάστε ξανά σε λίγο.");
  }
  let fields: FormData;
  try {
    fields = await request.formData();
  } catch {
    return jsonError(400, "Η μεταφόρτωση δεν ολοκληρώθηκε. Δοκιμάστε ξανά.");
  }
  const f = fields.get("file");
  if (!(f instanceof File)) return jsonError(400, "Δεν επιλέχθηκε αρχείο.");
  if (f.size > MAX_UPLOAD_BYTES) return jsonError(413, "Το αρχείο ξεπερνά το όριο των 20 MB.");
  const filename = (f.name || "photo").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120);
  return { user, file: Buffer.from(await f.arrayBuffer()), filename, fields };
}

export async function authorizeListingUpload(user: CurrentUser, listingId: string) {
  return checkListingAccess(user, listingId, "write");
}

/** Validates, stores the untouched original and its derivatives. */
export async function storeImageSet(prefix: string, file: Buffer) {
  const info = await validateImage(file);
  const derivs = await makeDerivatives(file);
  const s = storage();
  const originalKey = `${prefix}/original.${info.ext}`;
  const displayKey = `${prefix}/display.jpg`;
  const thumbKey = `${prefix}/thumb.jpg`;
  await s.put(originalKey, file, info.mime);
  await s.put(displayKey, derivs.display, "image/jpeg");
  await s.put(thumbKey, derivs.thumb, "image/jpeg");
  return { info, derivs, originalKey, displayKey, thumbKey };
}

export async function handleImageError(e: unknown, prefix: string | null) {
  if (prefix) await storage().deletePrefix(prefix).catch(() => {});
  if (e instanceof ImageValidationError) return jsonError(422, e.message);
  logger.error("upload.failed", { error: e });
  return jsonError(500, "Η επεξεργασία της εικόνας απέτυχε. Δοκιμάστε ξανά ή χρησιμοποιήστε άλλο αρχείο.");
}

export { db, storageKeys, markEdited };
