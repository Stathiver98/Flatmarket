"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { storage, storageKeys } from "@/server/storage";
import { getEnhancementProvider, ProviderError } from "@/server/images/providers";
import { makeDerivatives } from "@/server/images/process";
import { markEdited } from "@/server/listings/mutations";
import { logger } from "@/server/logger";
import { roomTypeSchema } from "@/lib/listing/schema";
import { ActionError, authorizeListing, guarded, refreshListing, type ActionState } from "./_shared";

async function photoContext(photoId: string) {
  if (typeof photoId !== "string" || photoId.length > 40) throw new ActionError("Μη έγκυρη φωτογραφία.");
  const photo = await db.photo.findUnique({ where: { id: photoId } });
  if (!photo) throw new ActionError("Η φωτογραφία δεν βρέθηκε.");
  const { user } = await authorizeListing(photo.listingId);
  return { user, photo };
}

const photoUpdateSchema = z.object({
  room: roomTypeSchema.nullable(),
  roomLabel: z.string().trim().max(60).nullable(),
  caption: z.string().trim().max(200).nullable(),
  includeInListing: z.boolean(),
});

export async function updatePhoto(photoId: string, input: z.input<typeof photoUpdateSchema>): Promise<ActionState> {
  return guarded(async () => {
    const { photo } = await photoContext(photoId);
    const parsed = photoUpdateSchema.safeParse(input);
    if (!parsed.success) throw new ActionError("Μη έγκυρα στοιχεία φωτογραφίας.");
    await db.photo.update({ where: { id: photoId }, data: parsed.data });
    await markEdited(photo.listingId);
    refreshListing(photo.listingId);
    return { ok: true };
  });
}

export async function reorderPhotos(listingId: string, orderedIds: string[]): Promise<ActionState> {
  return guarded(async () => {
    await authorizeListing(listingId);
    if (!Array.isArray(orderedIds) || orderedIds.length > 200) throw new ActionError("Μη έγκυρη σειρά.");
    const photos = await db.photo.findMany({ where: { listingId }, select: { id: true } });
    const own = new Set(photos.map((p) => p.id));
    if (orderedIds.length !== own.size || !orderedIds.every((id) => own.has(id))) {
      throw new ActionError("Η σειρά των φωτογραφιών άλλαξε σε άλλη καρτέλα. Ανανεώστε τη σελίδα.");
    }
    await db.$transaction(orderedIds.map((id, i) => db.photo.update({ where: { id }, data: { position: i } })));
    await markEdited(listingId);
    refreshListing(listingId);
    return { ok: true };
  });
}

export async function setCoverPhoto(photoId: string): Promise<ActionState> {
  return guarded(async () => {
    const { photo } = await photoContext(photoId);
    await db.$transaction([
      db.photo.updateMany({ where: { listingId: photo.listingId }, data: { isCover: false } }),
      db.photo.update({ where: { id: photoId }, data: { isCover: true, includeInListing: true } }),
    ]);
    await markEdited(photo.listingId);
    refreshListing(photo.listingId);
    return { ok: true };
  });
}

export async function deletePhoto(photoId: string): Promise<ActionState> {
  return guarded(async () => {
    const { photo } = await photoContext(photoId);
    await db.photo.delete({ where: { id: photoId } });
    await storage().deletePrefix(storageKeys.photo(photo.listingId, photoId));
    if (photo.isCover) {
      const next = await db.photo.findFirst({ where: { listingId: photo.listingId, includeInListing: true }, orderBy: { position: "asc" } });
      if (next) await db.photo.update({ where: { id: next.id }, data: { isCover: true } });
    }
    await markEdited(photo.listingId);
    refreshListing(photo.listingId);
    return { ok: true, message: "Η φωτογραφία διαγράφηκε." };
  });
}

/** Chooses which version (null = original) is used in the presentation. */
export async function selectPhotoVersion(photoId: string, variantId: string | null): Promise<ActionState> {
  return guarded(async () => {
    const { photo } = await photoContext(photoId);
    if (variantId) {
      const v = await db.photoVariant.findFirst({ where: { id: variantId, photoId } });
      if (!v || v.status !== "SUCCEEDED") throw new ActionError("Η έκδοση δεν είναι διαθέσιμη.");
      if (v.kind === "STAGED" && !v.approvedAt) {
        throw new ActionError("Εγκρίνετε πρώτα την ψηφιακά επιπλωμένη εικόνα.");
      }
    }
    await db.photo.update({ where: { id: photoId }, data: { selectedVariantId: variantId } });
    await markEdited(photo.listingId);
    refreshListing(photo.listingId);
    return { ok: true };
  });
}

export async function approveStagedVariant(variantId: string, confirmed: boolean): Promise<ActionState> {
  return guarded(async () => {
    const v = await db.photoVariant.findUnique({ where: { id: variantId } });
    if (!v || v.kind !== "STAGED") throw new ActionError("Η έκδοση δεν βρέθηκε.");
    const { photo } = await photoContext(v.photoId);
    if (!confirmed) throw new ActionError("Επιβεβαιώστε ότι έχετε ελέγξει την εικόνα.");
    await db.photoVariant.update({ where: { id: variantId }, data: { approvedAt: new Date() } });
    await markEdited(photo.listingId);
    refreshListing(photo.listingId);
    return { ok: true, message: "Η ψηφιακά επιπλωμένη εικόνα εγκρίθηκε." };
  });
}

export async function deleteVariant(variantId: string): Promise<ActionState> {
  return guarded(async () => {
    const v = await db.photoVariant.findUnique({ where: { id: variantId } });
    if (!v) throw new ActionError("Η έκδοση δεν βρέθηκε.");
    const { photo } = await photoContext(v.photoId);
    if (photo.selectedVariantId === variantId) {
      await db.photo.update({ where: { id: photo.id }, data: { selectedVariantId: null } });
    }
    await db.photoVariant.delete({ where: { id: variantId } });
    await storage().deletePrefix(storageKeys.variant(photo.listingId, photo.id, variantId));
    await markEdited(photo.listingId);
    refreshListing(photo.listingId);
    return { ok: true };
  });
}

/**
 * Runs an enhancement provider on the ORIGINAL photo and stores the result as
 * a separate variant. Status, provider and parameters are recorded; failures
 * keep a useful error and can be retried.
 */
export async function enhancePhoto(photoId: string, providerId: string, retryVariantId?: string): Promise<ActionState> {
  return guarded(async () => {
    const { photo } = await photoContext(photoId);
    const provider = getEnhancementProvider(providerId);
    if (!provider) throw new ActionError("Άγνωστος πάροχος επεξεργασίας.");
    if (!provider.isConfigured()) throw new ActionError(`Ο πάροχος «${provider.name}» δεν έχει ρυθμιστεί.`);

    let variant = retryVariantId
      ? await db.photoVariant.findFirst({ where: { id: retryVariantId, photoId, status: "FAILED" } })
      : null;
    if (!variant) {
      const running = await db.photoVariant.count({ where: { photoId, status: { in: ["PENDING", "PROCESSING"] } } });
      if (running > 0) throw new ActionError("Η φωτογραφία επεξεργάζεται ήδη.");
      variant = await db.photoVariant.create({
        data: { photoId, kind: "ENHANCED", status: "PENDING", provider: provider.id },
      });
    }
    await db.photoVariant.update({ where: { id: variant.id }, data: { status: "PROCESSING", attempts: { increment: 1 }, errorMessage: null } });

    const started = Date.now();
    try {
      const original = await storage().get(photo.originalKey);
      if (!original) throw new ProviderError("Το πρωτότυπο αρχείο δεν βρέθηκε στην αποθήκευση.", "missing_original", false);
      const result = await provider.enhance(original);
      const derivs = await makeDerivatives(result.data);
      const prefix = storageKeys.variant(photo.listingId, photo.id, variant.id);
      await storage().put(`${prefix}/full.jpg`, result.data, result.mime);
      await storage().put(`${prefix}/display.jpg`, derivs.display, "image/jpeg");
      await storage().put(`${prefix}/thumb.jpg`, derivs.thumb, "image/jpeg");
      await db.photoVariant.update({
        where: { id: variant.id },
        data: {
          status: "SUCCEEDED",
          operation: result.meta as object,
          storageKey: `${prefix}/full.jpg`,
          displayKey: `${prefix}/display.jpg`,
          thumbKey: `${prefix}/thumb.jpg`,
          width: derivs.width,
          height: derivs.height,
          completedAt: new Date(),
        },
      });
      await db.aiJob.create({
        data: { listingId: photo.listingId, kind: "PHOTO_ENHANCEMENT", provider: provider.id, status: "SUCCEEDED", durationMs: Date.now() - started },
      });
      refreshListing(photo.listingId);
      return { ok: true, message: "Η βελτιωμένη έκδοση είναι έτοιμη. Συγκρίνετέ τη με το πρωτότυπο πριν την επιλέξετε." };
    } catch (e) {
      const pe = e instanceof ProviderError ? e : null;
      const message = pe?.message ?? "Η επεξεργασία απέτυχε λόγω απρόσμενου σφάλματος.";
      await db.photoVariant.update({ where: { id: variant.id }, data: { status: "FAILED", errorMessage: message } });
      await db.aiJob.create({
        data: {
          listingId: photo.listingId,
          kind: "PHOTO_ENHANCEMENT",
          provider: provider.id,
          status: "FAILED",
          errorCode: pe?.code ?? "unexpected",
          durationMs: Date.now() - started,
        },
      });
      logger.warn("photo.enhance_failed", { listingId: photo.listingId, provider: provider.id, code: pe?.code ?? "unexpected" });
      refreshListing(photo.listingId);
      return { ok: false, error: `${message}${pe?.retryable === false ? "" : " Μπορείτε να δοκιμάσετε ξανά."}` };
    }
  });
}

// ---------------------------------------------------------------------------
// Floor plans
// ---------------------------------------------------------------------------

async function planContext(planId: string) {
  const plan = await db.floorPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new ActionError("Η κάτοψη δεν βρέθηκε.");
  await authorizeListing(plan.listingId);
  return plan;
}

export async function deleteFloorPlan(planId: string): Promise<ActionState> {
  return guarded(async () => {
    const plan = await planContext(planId);
    await db.floorPlan.delete({ where: { id: planId } });
    await storage().deletePrefix(storageKeys.floorPlan(plan.listingId, planId));
    await markEdited(plan.listingId);
    refreshListing(plan.listingId);
    return { ok: true };
  });
}

export async function renameFloorPlan(planId: string, label: string): Promise<ActionState> {
  return guarded(async () => {
    const plan = await planContext(planId);
    await db.floorPlan.update({ where: { id: planId }, data: { label: label.trim().slice(0, 80) || null } });
    await markEdited(plan.listingId);
    refreshListing(plan.listingId);
    return { ok: true };
  });
}

const hotspotSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  room: roomTypeSchema,
  roomLabel: z.string().trim().max(60).nullable(),
});

export async function addHotspot(planId: string, input: z.input<typeof hotspotSchema>): Promise<ActionState> {
  return guarded(async () => {
    const plan = await planContext(planId);
    const parsed = hotspotSchema.safeParse(input);
    if (!parsed.success) throw new ActionError("Μη έγκυρο σημείο.");
    const count = await db.floorPlanHotspot.count({ where: { floorPlanId: planId } });
    if (count >= 40) throw new ActionError("Έως 40 σημεία ανά κάτοψη.");
    await db.floorPlanHotspot.create({ data: { floorPlanId: planId, ...parsed.data } });
    await markEdited(plan.listingId);
    refreshListing(plan.listingId);
    return { ok: true };
  });
}

export async function deleteHotspot(hotspotId: string): Promise<ActionState> {
  return guarded(async () => {
    const h = await db.floorPlanHotspot.findUnique({ where: { id: hotspotId } });
    if (!h) throw new ActionError("Το σημείο δεν βρέθηκε.");
    const plan = await planContext(h.floorPlanId);
    await db.floorPlanHotspot.delete({ where: { id: hotspotId } });
    await markEdited(plan.listingId);
    refreshListing(plan.listingId);
    return { ok: true };
  });
}
