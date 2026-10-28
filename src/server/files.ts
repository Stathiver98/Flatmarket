import "server-only";
import { db } from "@/server/db";
import { storage } from "@/server/storage";
import { readSnapshot } from "@/server/listings/presentation";

export function fileResponse(data: Buffer, contentType: string, opts: { cache: "private" | "public"; download?: string } = { cache: "private" }) {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Length": String(data.length),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": opts.cache === "public" ? "public, max-age=300, stale-while-revalidate=3600" : "private, max-age=300",
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  };
  if (opts.download) {
    headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(opts.download)}`;
  }
  return new Response(new Uint8Array(data), { status: 200, headers });
}

export function notFoundResponse() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

/** Loads a published listing by its share token (PUBLIC or UNLISTED only). */
export async function getPublishedByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const l = await db.listing.findUnique({ where: { shareToken: token } });
  if (!l || l.status !== "PUBLISHED" || l.visibility === "PRIVATE") return null;
  const snapshot = readSnapshot(l.publishedSnapshot);
  if (!snapshot) return null;
  return { listing: l, snapshot };
}

export async function readKey(key: string | null | undefined) {
  if (!key) return null;
  return storage().get(key);
}
