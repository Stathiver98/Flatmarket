import type { MetadataRoute } from "next";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const pages = ["", "/how-it-works", "/services", "/agencies", "/pricing", "/contact"].map((p) => ({ url: `${base}${p}` }));
  const listings = await db.listing.findMany({
    where: { status: "PUBLISHED", visibility: "PUBLIC", slug: { not: null } },
    select: { slug: true, lastPublishedAt: true },
    take: 5000,
  });
  return [...pages, ...listings.map((l) => ({ url: `${base}/p/${l.slug}`, lastModified: l.lastPublishedAt ?? undefined }))];
}
