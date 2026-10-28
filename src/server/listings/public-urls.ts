import type { AssetUrls } from "@/components/listing/presentation-view";

/** Asset URLs for the owner preview (authenticated, current draft data). */
export function privateUrls(listingId: string): AssetUrls {
  return {
    photo: (id, v, size) => `/api/files/photos/${id}?s=${size}${v ? `&v=${v}` : ""}`,
    floorPlan: (id) => `/api/files/floorplans/${id}`,
    logo: (ws) => `/api/files/logo/${ws}`,
    brochure: (lang) => `/api/listings/${listingId}/export/brochure?lang=${lang}`,
  };
}

/** Asset URLs for a published page (only snapshot content is reachable). */
export function publicUrls(token: string): AssetUrls {
  return {
    photo: (id, _v, size) => `/api/public/${token}/photos/${id}${size === "thumb" ? "?s=thumb" : ""}`,
    floorPlan: (id) => `/api/public/${token}/floorplans/${id}`,
    logo: (ws) => `/api/files/logo/${ws}`,
    brochure: (lang) => `/api/public/${token}/brochure?lang=${lang}`,
  };
}
