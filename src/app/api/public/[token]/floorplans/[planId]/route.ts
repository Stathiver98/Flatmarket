import { db } from "@/server/db";
import { fileResponse, getPublishedByToken, notFoundResponse, readKey } from "@/server/files";

export async function GET(_request: Request, ctx: { params: Promise<{ token: string; planId: string }> }) {
  const { token, planId } = await ctx.params;
  const pub = await getPublishedByToken(token);
  if (!pub || !pub.snapshot.floorPlans.some((f) => f.id === planId)) return notFoundResponse();
  const plan = await db.floorPlan.findFirst({ where: { id: planId, listingId: pub.listing.id } });
  const data = await readKey(plan?.displayKey);
  if (!data) return notFoundResponse();
  return fileResponse(data, "image/jpeg", { cache: "public" });
}
