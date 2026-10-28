import { NextResponse } from "next/server";
import { createId } from "@/server/ids";
import { MAX_PHOTOS_PER_LISTING } from "@/server/images/process";
import { storage } from "@/server/storage";
import { logEvent } from "@/server/listings/mutations";
import {
  authorizeListingUpload,
  db,
  handleImageError,
  jsonError,
  markEdited,
  readUpload,
  storageKeys,
  storeImageSet,
} from "@/server/uploads";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await ctx.params;
  const up = await readUpload(request);
  if (up instanceof NextResponse) return up;
  if (!(await authorizeListingUpload(up.user, listingId))) return jsonError(404, "Η αγγελία δεν βρέθηκε.");

  const preCount = await db.photo.count({ where: { listingId } });
  if (preCount >= MAX_PHOTOS_PER_LISTING) {
    return jsonError(422, `Έχετε φτάσει το όριο των ${MAX_PHOTOS_PER_LISTING} φωτογραφιών ανά αγγελία.`);
  }

  const photoId = createId();
  const prefix = storageKeys.photo(listingId, photoId);
  try {
    const { info, derivs, originalKey, displayKey, thumbKey } = await storeImageSet(prefix, up.file);
    // Uploads run in parallel: lock the listing row so the limit, the position
    // and the automatic cover choice are computed one upload at a time.
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
      const count = await tx.photo.count({ where: { listingId } });
      if (count >= MAX_PHOTOS_PER_LISTING) return null;
      const max = await tx.photo.aggregate({
        where: { listingId },
        _max: { position: true },
      });
      const hasCover = await tx.photo.count({
        where: { listingId, isCover: true },
      });
      const photo = await tx.photo.create({
        data: {
          id: photoId,
          listingId,
          originalKey,
          displayKey,
          thumbKey,
          originalFilename: up.filename,
          mimeType: info.mime,
          sizeBytes: up.file.length,
          width: derivs.width,
          height: derivs.height,
          position: (max._max.position ?? -1) + 1,
          isCover: hasCover === 0,
        },
      });
      return { photo, first: count === 0 };
    });
    if (!result) {
      await storage().deletePrefix(prefix);
      return jsonError(422, `Έχετε φτάσει το όριο των ${MAX_PHOTOS_PER_LISTING} φωτογραφιών ανά αγγελία.`);
    }
    const { photo, first } = result;
    await markEdited(listingId);
    if (first) await logEvent(listingId, up.user.id, "first_photo_uploaded");
    return NextResponse.json({
      ok: true,
      photo: { id: photo.id, width: photo.width, height: photo.height },
    });
  } catch (e) {
    return handleImageError(e, prefix);
  }
}
