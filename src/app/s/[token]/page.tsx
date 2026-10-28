import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedByToken } from "@/server/files";
import { PublicListingPage, publicMetadata } from "@/server/listings/public-page";

// Link-only (and public) listings by their unguessable share token. Never indexed.
type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { token } = await params;
  const { lang } = await searchParams;
  const pub = await getPublishedByToken(token);
  if (!pub) return { title: "Η αγγελία δεν είναι διαθέσιμη", robots: { index: false } };
  return publicMetadata(pub.snapshot, token, lang === "en" ? "en" : "el", false, `/s/${token}`);
}

export default async function SharedListingPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { lang } = await searchParams;
  const pub = await getPublishedByToken(token);
  if (!pub) notFound();
  return <PublicListingPage p={pub.snapshot} token={token} lang={lang === "en" ? "en" : "el"} basePath={`/s/${token}`} />;
}
