import { NextResponse } from "next/server";
import { createId } from "@/server/ids";
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

const MAX_FLOOR_PLANS = 6;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await ctx.params;
  const up = await readUpload(request);
  if (up instanceof NextResponse) return up;
  if (!(await authorizeListingUpload(up.user, listingId))) return jsonError(404, "Η αγγελία δεν βρέθηκε.");
  const count = await db.floorPlan.count({ where: { listingId } });
  if (count >= MAX_FLOOR_PLANS) return jsonError(422, `Έως ${MAX_FLOOR_PLANS} κατόψεις ανά αγγελία.`);

  const planId = createId();
  const prefix = storageKeys.floorPlan(listingId, planId);
  try {
    const { info, derivs, originalKey, displayKey, thumbKey } = await storeImageSet(prefix, up.file);
    const label =
      String(up.fields.get("label") ?? "")
        .trim()
        .slice(0, 80) || null;
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
      const position = await tx.floorPlan.count({ where: { listingId } });
      await tx.floorPlan.create({
        data: {
          id: planId,
          listingId,
          label,
          originalKey,
          displayKey,
          thumbKey,
          originalFilename: up.filename,
          mimeType: info.mime,
          sizeBytes: up.file.length,
          width: derivs.width,
          height: derivs.height,
          position,
        },
      });
    });
    await markEdited(listingId);
    return NextResponse.json({ ok: true, id: planId });
  } catch (e) {
    return handleImageError(e, prefix);
  }
}
