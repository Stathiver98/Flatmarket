import { db } from "@/server/db";
import { fileResponse, notFoundResponse, readKey } from "@/server/files";

// Workspace logos are public branding assets (shown on published pages/PDFs).
export async function GET(_request: Request, ctx: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await ctx.params;
  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { logoKey: true } });
  const data = await readKey(ws?.logoKey);
  if (!data) return notFoundResponse();
  return fileResponse(data, "image/png", { cache: "public" });
}
