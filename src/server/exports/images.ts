import "server-only";
import sharp from "sharp";
import { db } from "@/server/db";
import { storage } from "@/server/storage";
import type { Presentation, PresentationPhoto } from "@/lib/listing/presentation";

/** Loads the presented version (original/enhanced/staged) of a photo from storage. */
export async function loadPhotoBuffer(listingId: string, ph: PresentationPhoto, quality: "display" | "full"): Promise<Buffer | null> {
  if (ph.variantId) {
    const v = await db.photoVariant.findFirst({ where: { id: ph.variantId, photoId: ph.id, status: "SUCCEEDED" } });
    if (!v) return null;
    return storage().get((quality === "full" ? v.storageKey : v.displayKey) ?? "");
  }
  const p = await db.photo.findFirst({ where: { id: ph.id, listingId } });
  if (!p) return null;
  if (quality === "full") {
    const original = await storage().get(p.originalKey);
    // Full-resolution download without camera metadata (EXIF/GPS).
    return original ? sharp(original).rotate().toColourspace("srgb").jpeg({ quality: 92 }).toBuffer() : null;
  }
  return storage().get(p.displayKey);
}

/** Compact JPEG suitable for embedding in a PDF. */
export async function pdfImage(buf: Buffer, maxWidth = 1600) {
  return sharp(buf).resize({ width: maxWidth, height: maxWidth, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
}

export async function loadPdfImages(p: Presentation, limit: number) {
  const out: { photo: PresentationPhoto; data: Buffer }[] = [];
  for (const ph of p.photos.slice(0, limit)) {
    const buf = await loadPhotoBuffer(p.listingId, ph, "display");
    if (buf) out.push({ photo: ph, data: await pdfImage(buf) });
  }
  return out;
}

export async function loadFloorPlanImages(p: Presentation) {
  const out: { id: string; label: string | null; data: Buffer; hotspots: Presentation["floorPlans"][number]["hotspots"] }[] = [];
  for (const f of p.floorPlans) {
    const plan = await db.floorPlan.findFirst({ where: { id: f.id, listingId: p.listingId } });
    const buf = plan ? await storage().get(plan.displayKey) : null;
    if (buf) out.push({ id: f.id, label: f.label, data: await pdfImage(buf, 1800), hotspots: f.hotspots });
  }
  return out;
}

export async function loadLogo(workspaceId: string) {
  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { logoKey: true } });
  if (!ws?.logoKey) return null;
  const buf = await storage().get(ws.logoKey);
  return buf ? sharp(buf).resize({ height: 160, withoutEnlargement: true }).png().toBuffer() : null;
}
