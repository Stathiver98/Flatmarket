import { getCurrentUser } from "@/server/auth/session";
import { checkListingAccess } from "@/server/auth/guards";
import { getListingFull } from "@/server/listings/queries";
import { buildPresentation } from "@/server/listings/presentation";
import { renderBrochure, renderFactsheet } from "@/server/exports/pdf";
import { buildPackageZip, buildPhotosZip } from "@/server/exports/package";
import { rateLimit } from "@/server/security/rate-limit";
import { fileResponse, notFoundResponse } from "@/server/files";
import { logger } from "@/server/logger";

export const maxDuration = 120;

// Owner exports, generated from the CURRENT data (approved texts only,
// photos included in the listing). Works before publication.
export async function GET(request: Request, ctx: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await ctx.params;
  const lang = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "el";
  const user = await getCurrentUser();
  if (!user || !(await checkListingAccess(user, id, "read"))) return notFoundResponse();
  if (!(await rateLimit(`export:${user.id}`, 60, 3600))) {
    return new Response("Πολλές λήψεις σε σύντομο χρόνο. Δοκιμάστε ξανά σε λίγο.", { status: 429 });
  }
  const l = await getListingFull(id);
  if (!l) return notFoundResponse();
  const p = buildPresentation(l);
  const ref = l.reference;
  try {
    switch (kind) {
      case "brochure":
        return fileResponse(await renderBrochure(p, lang), "application/pdf", { cache: "private", download: `${ref}_brochure_${lang}.pdf` });
      case "factsheet":
        return fileResponse(await renderFactsheet(p, lang), "application/pdf", { cache: "private", download: `${ref}_factsheet_${lang}.pdf` });
      case "photos":
        return fileResponse(await buildPhotosZip(p), "application/zip", { cache: "private", download: `${ref}_photos.zip` });
      case "package":
        return fileResponse(await buildPackageZip(p), "application/zip", { cache: "private", download: `${ref}_package.zip` });
      default:
        return notFoundResponse();
    }
  } catch (e) {
    logger.error("export.failed", { listingId: id, kind, error: e });
    return new Response("Η δημιουργία του αρχείου απέτυχε. Δοκιμάστε ξανά.", { status: 500 });
  }
}
