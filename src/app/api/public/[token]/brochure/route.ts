import { fileResponse, getPublishedByToken, notFoundResponse } from "@/server/files";
import { renderBrochure } from "@/server/exports/pdf";
import { rateLimit } from "@/server/security/rate-limit";
import { getClientIp } from "@/server/security/request";
import { hashIp } from "@/server/security/crypto";

export const maxDuration = 60;

// Visitor brochure download, generated strictly from the published snapshot.
export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const lang = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "el";
  const pub = await getPublishedByToken(token);
  if (!pub) return notFoundResponse();
  if (!(await rateLimit(`pub-pdf:${hashIp(await getClientIp())}`, 20, 3600))) {
    return new Response("Too many requests", { status: 429 });
  }
  const pdf = await renderBrochure(pub.snapshot, lang);
  return fileResponse(pdf, "application/pdf", { cache: "public", download: `${pub.listing.reference}_${lang}.pdf` });
}
