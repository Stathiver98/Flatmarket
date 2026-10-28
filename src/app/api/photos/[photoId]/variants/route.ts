import { NextResponse } from "next/server";
import { createId } from "@/server/ids";
import { authorizeListingUpload, db, handleImageError, jsonError, markEdited, readUpload, storageKeys, storeImageSet } from "@/server/uploads";

// Manual upload of a derived version of an existing photo:
// - kind=ENHANCED: a professionally edited version (same scene, corrected light/colour)
// - kind=STAGED:   a digitally staged version (always labelled, needs explicit approval)
export async function POST(request: Request, ctx: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await ctx.params;
  const up = await readUpload(request);
  if (up instanceof NextResponse) return up;
  const photo = await db.photo.findUnique({ where: { id: photoId }, select: { id: true, listingId: true } });
  if (!photo || !(await authorizeListingUpload(up.user, photo.listingId))) return jsonError(404, "Η φωτογραφία δεν βρέθηκε.");
  const kind = up.fields.get("kind");
  if (kind !== "ENHANCED" && kind !== "STAGED") return jsonError(400, "Μη έγκυρος τύπος έκδοσης.");
  if (kind === "STAGED" && up.fields.get("acknowledge") !== "on") {
    return jsonError(422, "Επιβεβαιώστε ότι η εικόνα θα εμφανίζεται με την ένδειξη «Ψηφιακή επίπλωση».");
  }
  const count = await db.photoVariant.count({ where: { photoId } });
  if (count >= 10) return jsonError(422, "Έως 10 εκδόσεις ανά φωτογραφία. Διαγράψτε κάποια παλιότερη.");

  const variantId = createId();
  const prefix = storageKeys.variant(photo.listingId, photoId, variantId);
  try {
    const { info, derivs, originalKey, displayKey, thumbKey } = await storeImageSet(prefix, up.file);
    await db.photoVariant.create({
      data: {
        id: variantId,
        photoId,
        kind,
        status: "SUCCEEDED",
        provider: "manual-upload",
        operation: { source: "user_upload", filename: up.filename, mime: info.mime },
        storageKey: originalKey,
        displayKey,
        thumbKey,
        width: derivs.width,
        height: derivs.height,
        completedAt: new Date(),
      },
    });
    await markEdited(photo.listingId);
    return NextResponse.json({ ok: true, id: variantId });
  } catch (e) {
    return handleImageError(e, prefix);
  }
}
