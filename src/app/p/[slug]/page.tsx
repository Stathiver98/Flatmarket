import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { readSnapshot } from "@/server/listings/presentation";
import { PublicListingPage, publicMetadata } from "@/server/listings/public-page";

// Public, indexable listing pages. Only listings published with visibility PUBLIC.
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };

async function load(slug: string) {
  if (!/^[a-z0-9-]{3,120}$/.test(slug)) return null;
  const l = await db.listing.findUnique({ where: { slug } });
  if (!l || l.status !== "PUBLISHED" || l.visibility !== "PUBLIC") return null;
  const snapshot = readSnapshot(l.publishedSnapshot);
  return snapshot ? { l, snapshot } : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  const r = await load(slug);
  if (!r) return { title: "Η αγγελία δεν είναι διαθέσιμη", robots: { index: false } };
  return publicMetadata(r.snapshot, r.l.shareToken, lang === "en" ? "en" : "el", true, `/p/${slug}`);
}

export default async function PublicListing({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const r = await load(slug);
  if (!r) notFound();
  return <PublicListingPage p={r.snapshot} token={r.l.shareToken} lang={lang === "en" ? "en" : "el"} basePath={`/p/${slug}`} />;
}
