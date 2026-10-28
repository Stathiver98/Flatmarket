import { db } from "@/server/db";
import { fileResponse, getPublishedByToken, notFoundResponse, readKey } from "@/server/files";

// Public photo access: only for published listings, only for photos (and the
// exact version) included in the published snapshot. Serves metadata-free
// derivatives — never the original upload.
export async function GET(request: Request, ctx: { params: Promise<{ token: string; photoId: string }> }) {
  const { token, photoId } = await ctx.params;
  const size = new URL(request.url).searchParams.get("s") === "thumb" ? "thumb" : "display";
  const pub = await getPublishedByToken(token);
  if (!pub) return notFoundResponse();
  const entry = pub.snapshot.photos.find((p) => p.id === photoId);
  if (!entry) return notFoundResponse();

  let key: string | null = null;
  if (entry.variantId) {
    const v = await db.photoVariant.findFirst({ where: { id: entry.variantId, photoId, status: "SUCCEEDED" } });
    if (v) key = size === "thumb" ? v.thumbKey : v.displayKey;
  } else {
    const p = await db.photo.findFirst({ where: { id: photoId, listingId: pub.listing.id } });
    if (p) key = size === "thumb" ? p.thumbKey : p.displayKey;
  }
  const data = await readKey(key);
  if (!data) return notFoundResponse();
  return fileResponse(data, "image/jpeg", { cache: "public" });
}
