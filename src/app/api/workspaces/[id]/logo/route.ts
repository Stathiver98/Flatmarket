import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/server/db";
import { storage, storageKeys } from "@/server/storage";
import { jsonError, readUpload } from "@/server/uploads";
import { ImageValidationError, validateImage } from "@/server/images/process";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const up = await readUpload(request);
  if (up instanceof NextResponse) return up;
  const m = await db.membership.findUnique({ where: { workspaceId_userId: { workspaceId: id, userId: up.user.id } } });
  if (!m || m.role !== "OWNER") return jsonError(403, "Μόνο ο διαχειριστής του χώρου εργασίας μπορεί να αλλάξει το λογότυπο.");
  try {
    await validateImage(up.file).catch((e) => {
      // Logos may be smaller than photos; allow anything sharp can decode.
      if (e instanceof ImageValidationError && /πολύ μικρή/.test(e.message)) return;
      throw e;
    });
    const png = await sharp(up.file).rotate().resize({ width: 600, height: 300, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    const key = `${storageKeys.logo(id)}/logo-${Date.now()}.png`;
    await storage().put(key, png, "image/png");
    await db.workspace.update({ where: { id }, data: { logoKey: key } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ImageValidationError) return jsonError(422, e.message);
    return jsonError(500, "Η επεξεργασία του λογοτύπου απέτυχε.");
  }
}
