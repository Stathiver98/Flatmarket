import "server-only";
import { readDetails } from "@/lib/listing/schema";
import { defaultTitle, publicLocation } from "@/lib/listing/format";
import type { Presentation, PresentationContent, PresentationPhoto } from "@/lib/listing/presentation";
import { parseTourUrl } from "@/lib/tour-hosts";
import type { ListingFull } from "./queries";

/** Which version of a photo will be presented (original, enhanced or staged). */
export function presentedVersion(photo: ListingFull["photos"][number]) {
  const v = photo.selectedVariantId ? photo.variants.find((x) => x.id === photo.selectedVariantId) : null;
  if (!v || v.status !== "SUCCEEDED") return null;
  if (v.kind === "STAGED" && !v.approvedAt) return null;
  return v;
}

/**
 * Builds the presentation from current data. Only APPROVED text sections are
 * used, only photos marked for inclusion, and the private address is omitted
 * unless the owner chose full-address visibility.
 */
export function buildPresentation(l: ListingFull): Presentation {
  const content = (lang: "el" | "en"): PresentationContent => {
    const get = (key: string) => {
      const c = l.content.find((x) => x.key === key && x.lang === lang && x.approved);
      return c && c.text.trim() ? c.text.trim() : null;
    };
    const features = get("features");
    return {
      headline: get("headline"),
      summary: get("summary"),
      description: get("description"),
      features: features ? features.split("\n").map((s) => s.replace(/^[-•*]\s*/, "").trim()).filter(Boolean) : [],
      social: get("social"),
    };
  };

  const photos: PresentationPhoto[] = l.photos
    .filter((p) => p.includeInListing)
    .map((p) => {
      const v = presentedVersion(p);
      return {
        id: p.id,
        variantId: v?.id ?? null,
        kind: v ? (v.kind === "STAGED" ? "STAGED" : "ENHANCED") : "ORIGINAL",
        provider: v?.provider ?? null,
        room: p.room,
        roomLabel: p.roomLabel,
        caption: p.caption,
        isCover: p.isCover,
        width: v?.width ?? p.width,
        height: v?.height ?? p.height,
      };
    });

  const tour = l.externalTourUrl ? parseTourUrl(l.externalTourUrl) : null;
  const ws = l.workspace;

  return {
    version: 1,
    listingId: l.id,
    reference: l.reference,
    purpose: l.purpose,
    propertyType: l.propertyType,
    fallbackTitle: { el: l.title || defaultTitle(l, "el"), en: defaultTitle(l, "en") },
    location: publicLocation(l),
    price: l.price,
    priceOnRequest: l.priceOnRequest,
    areaSqm: l.areaSqm,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    floor: l.floor,
    availability: l.availability,
    availableFrom: l.availableFrom ? l.availableFrom.toISOString() : null,
    details: readDetails(l.details),
    content: { el: content("el"), en: content("en") },
    photos,
    floorPlans: l.floorPlans.map((f) => ({
      id: f.id,
      label: f.label,
      width: f.width,
      height: f.height,
      hotspots: f.hotspots.map((h) => ({ x: h.x, y: h.y, room: h.room, roomLabel: h.roomLabel })),
    })),
    tour: tour && tour.ok ? { url: tour.url, embedUrl: tour.embedUrl, providerName: tour.providerName } : null,
    contact: {
      name: l.contactName,
      email: l.showContactEmail ? l.contactEmail : null,
      phone: l.showContactPhone ? l.contactPhone : null,
      enquiriesEnabled: l.enquiriesEnabled,
    },
    branding: l.showBranding
      ? {
          workspaceId: ws.id,
          displayName: ws.displayName,
          hasLogo: Boolean(ws.logoKey),
          website: ws.website,
          registryNumber: ws.registryNumber,
        }
      : null,
    updatedAt: new Date().toISOString(),
  };
}

export function readSnapshot(raw: unknown): Presentation | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Presentation;
  return p.version === 1 && Array.isArray(p.photos) ? p : null;
}
