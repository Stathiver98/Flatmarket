import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { checkListingAccess } from "@/server/auth/guards";
import { cleanFullResolution } from "@/server/images/process";
import { fileResponse, notFoundResponse, readKey } from "@/server/files";

// Private photo access for listing members (and admins, read-only).
// ?s=thumb|display|full|original  &v=<variantId>
export async function GET(request: Request, ctx: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await ctx.params;
  const url = new URL(request.url);
  const size = url.searchParams.get("s") ?? "display";
  const variantId = url.searchParams.get("v");

  const user = await getCurrentUser();
  if (!user) return notFoundResponse();
  const photo = await db.photo.findUnique({ where: { id: photoId } });
  if (!photo || !(await checkListingAccess(user, photo.listingId, "read"))) return notFoundResponse();

  if (variantId) {
    const v = await db.photoVariant.findFirst({ where: { id: variantId, photoId } });
    if (!v || v.status !== "SUCCEEDED") return notFoundResponse();
    const key = size === "thumb" ? v.thumbKey : size === "full" || size === "original" ? v.storageKey : v.displayKey;
    const data = await readKey(key);
    if (!data) return notFoundResponse();
    if (size === "full" || size === "original") {
      const label = v.kind === "STAGED" ? "digitally-staged" : "enhanced";
      return fileResponse(await cleanFullResolution(data), "image/jpeg", { cache: "private", download: `${photo.id}-${label}.jpg` });
    }
    return fileResponse(data, "image/jpeg");
  }

  if (size === "original") {
    // Byte-for-byte original (may include camera metadata). Owner download only.
    const data = await readKey(photo.originalKey);
    if (!data) return notFoundResponse();
    return fileResponse(data, photo.mimeType, { cache: "private", download: photo.originalFilename });
  }
  if (size === "full") {
    const data = await readKey(photo.originalKey);
    if (!data) return notFoundResponse();
    return fileResponse(await cleanFullResolution(data), "image/jpeg", { cache: "private", download: `${photo.id}.jpg` });
  }
  const data = await readKey(size === "thumb" ? photo.thumbKey : photo.displayKey);
  if (!data) return notFoundResponse();
  return fileResponse(data, "image/jpeg");
}
