import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/server/db";
import { randomToken } from "@/server/security/crypto";
import type { Prisma } from "@/generated/prisma/client";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeReference() {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `FM-${s}`;
}

export async function createListing(workspaceId: string, userId: string) {
  const ws = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const listing = await db.listing.create({
        data: {
          workspaceId,
          createdById: userId,
          reference: makeReference(),
          shareToken: randomToken(24),
          contactName: ws.contactName ?? ws.displayName,
          contactEmail: ws.contactEmail,
          contactPhone: ws.contactPhone,
        },
      });
      await logEvent(listing.id, userId, "created");
      return listing;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") continue; // reference collision, retry
      throw e;
    }
  }
  throw new Error("Could not allocate a listing reference");
}

export async function logEvent(listingId: string, actorId: string | null, type: string, data?: Prisma.InputJsonValue) {
  await db.listingEvent.create({ data: { listingId, actorId, type, data } });
}

/**
 * Called after any change to listing data. An approval applies to a specific
 * version of the listing, so edits withdraw it:
 * - READY -> DRAFT (needs approval again)
 * - PUBLISHED stays live with the previously approved snapshot, but is marked
 *   as having unpublished changes until the owner approves and republishes.
 */
export async function markEdited(listingId: string) {
  const l = await db.listing.findUnique({ where: { id: listingId }, select: { status: true, approvedAt: true } });
  if (!l) return;
  if (l.status === "READY") {
    await db.listing.update({ where: { id: listingId }, data: { status: "DRAFT", approvedAt: null, approvedById: null } });
  } else if (l.status === "PUBLISHED") {
    await db.listing.update({
      where: { id: listingId },
      data: { hasUnpublishedChanges: true, approvedAt: null, approvedById: null },
    });
  } else if (l.approvedAt) {
    await db.listing.update({ where: { id: listingId }, data: { approvedAt: null, approvedById: null } });
  } else {
    await db.listing.update({ where: { id: listingId }, data: { updatedAt: new Date() } });
  }
}
