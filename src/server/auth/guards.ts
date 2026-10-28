import "server-only";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { getCurrentUser, type CurrentUser } from "./session";

/** For pages/actions that need a signed-in user. */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** Admin-only areas respond with 404 to everyone else (no existence leak). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();
  return user;
}

export async function getUserWorkspaces(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({ ...m.workspace, role: m.role }));
}

export async function getWorkspaceIdsForUser(userId: string) {
  const ms = await db.membership.findMany({ where: { userId }, select: { workspaceId: true } });
  return ms.map((m) => m.workspaceId);
}

export async function isWorkspaceMember(userId: string, workspaceId: string) {
  const m = await db.membership.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
  return Boolean(m);
}

export type ListingAccess = "write" | "read";

/**
 * Returns the listing id if the user may access it, otherwise null.
 * - Workspace members can read and write.
 * - Administrators can read (for review/support) but not edit content.
 */
export async function checkListingAccess(user: CurrentUser, listingId: string, mode: ListingAccess) {
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { id: true, workspaceId: true } });
  if (!listing) return null;
  if (await isWorkspaceMember(user.id, listing.workspaceId)) return listing;
  if (mode === "read" && user.role === "ADMIN") return listing;
  return null;
}

/** Page helper: 404 when the listing does not exist or is not accessible. */
export async function requireListingAccess(listingId: string, mode: ListingAccess = "write") {
  const user = await requireUser(`/app/listings/${listingId}`);
  const listing = await checkListingAccess(user, listingId, mode);
  if (!listing) notFound();
  return { user, listing };
}
