import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { checkListingAccess } from "@/server/auth/guards";
import { fileResponse, notFoundResponse, readKey } from "@/server/files";

export async function GET(request: Request, ctx: { params: Promise<{ planId: string }> }) {
  const { planId } = await ctx.params;
  const size = new URL(request.url).searchParams.get("s") ?? "display";
  const user = await getCurrentUser();
  if (!user) return notFoundResponse();
  const plan = await db.floorPlan.findUnique({ where: { id: planId } });
  if (!plan || !(await checkListingAccess(user, plan.listingId, "read"))) return notFoundResponse();
  const data = await readKey(size === "thumb" ? plan.thumbKey : plan.displayKey);
  if (!data) return notFoundResponse();
  return fileResponse(data, "image/jpeg");
}
