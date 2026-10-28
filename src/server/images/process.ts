import "server-only";
import sharp from "sharp";

// Image validation and derivative generation.
// - The ORIGINAL upload is kept byte-for-byte (it may contain EXIF/GPS data,
//   so it is never served publicly).
// - DISPLAY (max 2400px) and THUMB (max 640px) derivatives are auto-rotated,
//   converted to sRGB JPEG and stripped of all metadata.

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB per image
export const MAX_PHOTOS_PER_LISTING = 60;
export const ACCEPTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_IMAGE_LABEL = "JPEG, PNG ή WebP, έως 20 MB";

const FORMAT_TO_MIME: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export class ImageValidationError extends Error {}

export type ValidatedImage = { mime: string; ext: string; width: number; height: number };

/** Validates by decoding the actual bytes (not the filename or declared type). */
export async function validateImage(buf: Buffer): Promise<ValidatedImage> {
  if (buf.length === 0) throw new ImageValidationError("Το αρχείο είναι κενό.");
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError("Το αρχείο ξεπερνά το όριο των 20 MB.");
  }
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(buf, { failOn: "error", limitInputPixels: 120_000_000 }).metadata();
  } catch {
    throw new ImageValidationError(
      "Το αρχείο δεν αναγνωρίζεται ως εικόνα. Αν πρόκειται για HEIC (iPhone), εξαγάγετέ το ως JPEG.",
    );
  }
  const mime = meta.format ? FORMAT_TO_MIME[meta.format] : undefined;
  if (!mime) {
    const hint = meta.format === "heif" ? " Οι φωτογραφίες HEIC (iPhone) πρέπει να μετατραπούν σε JPEG." : "";
    throw new ImageValidationError(`Μη υποστηριζόμενη μορφή εικόνας. Δεκτές μορφές: ${ACCEPTED_IMAGE_LABEL}.${hint}`);
  }
  if (!meta.width || !meta.height || meta.width < 300 || meta.height < 300) {
    throw new ImageValidationError("Η εικόνα είναι πολύ μικρή (ελάχιστο 300×300 pixels).");
  }
  return { mime, ext: meta.format === "jpeg" ? "jpg" : meta.format!, width: meta.width, height: meta.height };
}

export type Derivatives = { display: Buffer; thumb: Buffer; width: number; height: number };

export async function makeDerivatives(buf: Buffer): Promise<Derivatives> {
  const base = sharp(buf, { limitInputPixels: 120_000_000 }).rotate().toColourspace("srgb");
  const display = await base
    .clone()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  return { display: display.data, thumb, width: display.info.width, height: display.info.height };
}

/** Full-resolution, metadata-free JPEG for downloads (EXIF/GPS removed). */
export async function cleanFullResolution(buf: Buffer): Promise<Buffer> {
  return sharp(buf, { limitInputPixels: 120_000_000 }).rotate().toColourspace("srgb").jpeg({ quality: 92 }).toBuffer();
}

/**
 * Built-in "basic correction". Deterministic global adjustments only: tonal
 * range normalisation, a neutral white-balance nudge, gentle saturation and
 * light sharpening. It never adds, removes or moves anything in the picture,
 * and it does not correct perspective.
 */
export async function basicCorrection(buf: Buffer): Promise<Buffer> {
  const img = sharp(buf, { limitInputPixels: 120_000_000 }).rotate().toColourspace("srgb");
  const stats = await img.clone().stats();
  // Grey-world white balance, clamped to small corrections.
  const means = stats.channels.slice(0, 3).map((c) => c.mean);
  const grey = (means[0] + means[1] + means[2]) / 3;
  const gains = means.map((m) => Math.min(1.08, Math.max(0.92, grey / Math.max(m, 1))));
  return img
    .linear(gains, [0, 0, 0])
    .normalise({ lower: 1, upper: 99 })
    .modulate({ saturation: 1.05 })
    .sharpen({ sigma: 0.7 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}
