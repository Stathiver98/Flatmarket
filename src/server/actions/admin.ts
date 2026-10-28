"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/server/auth/session";
import { createPasswordResetLink } from "@/server/auth/reset";
import { logEvent } from "@/server/listings/mutations";
import { logger } from "@/server/logger";
import { ActionError, guarded, type ActionState } from "./_shared";

async function requireAdminAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new ActionError("Δεν επιτρέπεται.");
  return user;
}

/**
 * Admin review of a listing. Admins can leave notes for the owner, return a
 * listing from review to draft, or take a published page down (moderation).
 * They can never approve or publish on the owner's behalf.
 */
export async function adminUpdateListing(listingId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const admin = await requireAdminAction();
    const action = z.enum(["notes", "return_to_draft", "mark_in_review", "takedown"]).parse(fd.get("action"));
    const notes = String(fd.get("adminNotes") ?? "").trim().slice(0, 4000) || null;
    const l = await db.listing.findUnique({ where: { id: listingId }, select: { status: true } });
    if (!l) throw new ActionError("Η αγγελία δεν βρέθηκε.");
    const data: Prisma.ListingUpdateInput = { adminNotes: notes };
    if (action === "return_to_draft") {
      if (l.status !== "AWAITING_REVIEW") throw new ActionError("Μόνο αγγελίες σε έλεγχο επιστρέφουν σε πρόχειρο.");
      data.status = "DRAFT";
    }
    if (action === "mark_in_review") {
      if (l.status !== "DRAFT") throw new ActionError("Μόνο πρόχειρες αγγελίες μπορούν να σημειωθούν ως «σε έλεγχο».");
      data.status = "AWAITING_REVIEW";
    }
    if (action === "takedown") {
      if (l.status !== "PUBLISHED") throw new ActionError("Η αγγελία δεν είναι δημοσιευμένη.");
      data.status = "DRAFT";
      data.visibility = "PRIVATE";
      data.approvedAt = null;
      data.publishedSnapshot = Prisma.DbNull;
      data.hasUnpublishedChanges = false;
    }
    await db.listing.update({ where: { id: listingId }, data });
    if (action !== "notes") await logEvent(listingId, admin.id, "admin_status_changed", { action });
    logger.info("admin.listing_updated", { listingId, action });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Η αγγελία ενημερώθηκε." };
  });
}

export async function adminUpdateRequest(requestId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await requireAdminAction();
    const status = z.enum(["NEW", "IN_PROGRESS", "DONE", "ARCHIVED"]).parse(fd.get("status"));
    const internalNotes = String(fd.get("internalNotes") ?? "").trim().slice(0, 4000) || null;
    await db.contactRequest.update({ where: { id: requestId }, data: { status, internalNotes } });
    revalidatePath("/admin/requests");
    return { ok: true, message: "Αποθηκεύτηκε." };
  });
}

export type ResetLinkState = (ActionState & { link?: string }) | null;

/** For installations without email: an admin can hand a reset link to a user (valid 1 hour). */
export async function adminCreateResetLink(userId: string): Promise<ResetLinkState> {
  return guarded(async () => {
    const admin = await requireAdminAction();
    const u = await db.user.findUnique({ where: { id: userId } });
    if (!u) throw new ActionError("Ο χρήστης δεν βρέθηκε.");
    const link = await createPasswordResetLink(u.id);
    logger.info("admin.reset_link_created", { adminId: admin.id, userId });
    return { ok: true, link, message: "Ο σύνδεσμος ισχύει για 1 ώρα και για μία χρήση. Στείλτε τον μόνο στον ίδιο τον χρήστη." };
  });
}
