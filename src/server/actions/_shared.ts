import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth/session";
import { checkListingAccess } from "@/server/auth/guards";

export type ActionState = {
  ok?: boolean;
  error?: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string>;
} | null;

export class ActionError extends Error {}

/** Server-side authorization for every listing mutation. */
export async function authorizeListing(listingId: string) {
  const user = await getCurrentUser();
  if (!user) throw new ActionError("Η σύνδεσή σας έληξε. Συνδεθείτε ξανά.");
  if (typeof listingId !== "string" || listingId.length > 40) throw new ActionError("Μη έγκυρη αγγελία.");
  const listing = await checkListingAccess(user, listingId, "write");
  if (!listing) throw new ActionError("Δεν έχετε πρόσβαση σε αυτή την αγγελία.");
  return { user, listing };
}

export function refreshListing(listingId: string) {
  revalidatePath(`/app/listings/${listingId}`, "layout");
  revalidatePath("/app");
}

/** Wraps an action so expected errors become user-facing messages. */
export async function guarded<T extends ActionState>(fn: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message };
    // Let Next.js redirects/notFound propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(JSON.stringify({ level: "error", event: "action.unexpected", error: e instanceof Error ? e.message.slice(0, 200) : "unknown" }));
    return { ok: false, error: "Παρουσιάστηκε απρόσμενο σφάλμα. Δοκιμάστε ξανά." };
  }
}
