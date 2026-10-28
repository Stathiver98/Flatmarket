import "server-only";
import type { Metadata } from "next";
import { env } from "@/server/env";
import { createFormToken } from "@/server/security/crypto";
import { coverPhoto, presentationTitle, priceText } from "@/lib/listing/presentation";
import type { Presentation } from "@/lib/listing/presentation";
import { PresentationView } from "@/components/listing/presentation-view";
import { publicUrls } from "./public-urls";

export function publicMetadata(p: Presentation, token: string, lang: "el" | "en", indexable: boolean, canonicalPath: string): Metadata {
  const title = presentationTitle(p, lang);
  const description = p.content[lang].summary ?? p.content.el.summary ?? [p.location, priceText(p, lang)].filter(Boolean).join(" · ");
  const cover = coverPhoto(p);
  return {
    title,
    description,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    alternates: { canonical: `${env.appUrl}${canonicalPath}` },
    openGraph: {
      title,
      description,
      type: "website",
      locale: lang === "el" ? "el_GR" : "en_GB",
      url: `${env.appUrl}${canonicalPath}`,
      images: cover ? [{ url: `${env.appUrl}/api/public/${token}/photos/${cover.id}`, width: cover.width, height: cover.height }] : undefined,
    },
    twitter: { card: cover ? "summary_large_image" : "summary", title, description },
  };
}

export function PublicListingPage({ p, token, lang, basePath }: { p: Presentation; token: string; lang: "el" | "en"; basePath: string }) {
  return (
    <PresentationView
      p={p}
      lang={lang}
      urls={publicUrls(token)}
      langHref={(lg) => (lg === "el" ? basePath : `${basePath}?lang=en`)}
      enquiry={p.contact.enquiriesEnabled ? { token, formToken: createFormToken(`enquiry:${token}`), preview: false } : null}
    />
  );
}
