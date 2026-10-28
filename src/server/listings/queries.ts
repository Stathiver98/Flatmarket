import "server-only";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import { readDetails } from "@/lib/listing/schema";
import { computeCompleteness } from "@/lib/listing/completeness";

export const listingFullInclude = {
  workspace: true,
  photos: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    include: { variants: { orderBy: { createdAt: "desc" } } },
  },
  floorPlans: { orderBy: [{ position: "asc" }, { createdAt: "asc" }], include: { hotspots: true } },
  content: true,
} satisfies Prisma.ListingInclude;

export async function getListingFull(listingId: string) {
  return db.listing.findUnique({ where: { id: listingId }, include: listingFullInclude });
}

export type ListingFull = NonNullable<Awaited<ReturnType<typeof getListingFull>>>;

export function completenessFor(l: ListingFull) {
  return computeCompleteness({
    purpose: l.purpose,
    propertyType: l.propertyType,
    region: l.region,
    municipality: l.municipality,
    price: l.price,
    priceOnRequest: l.priceOnRequest,
    areaSqm: l.areaSqm,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    floor: l.floor,
    availability: l.availability,
    details: readDetails(l.details),
    photos: l.photos.map((p) => ({ room: p.room, includeInListing: p.includeInListing, isCover: p.isCover })),
    floorPlanCount: l.floorPlans.length,
    content: l.content.map((c) => ({ key: c.key, lang: c.lang, approved: c.approved, text: c.text })),
    contactEmail: l.contactEmail,
    contactPhone: l.contactPhone,
  });
}

/**
 * Minimum requirements before a listing can be approved for publication.
 * (Stricter than nothing, looser than 100% completeness: optional details can
 * stay empty, but nobody should publish a listing without these.)
 */
export function publicationBlockers(l: ListingFull): string[] {
  const blockers: string[] = [];
  const included = l.photos.filter((p) => p.includeInListing);
  if (!l.purpose) blockers.push("Επιλέξτε πώληση ή ενοικίαση.");
  if (!l.propertyType) blockers.push("Επιλέξτε τύπο ακινήτου.");
  if (!l.region || !l.municipality) blockers.push("Συμπληρώστε την περιοχή (περιφέρεια/νομό και δήμο).");
  if (!l.price && !l.priceOnRequest) blockers.push("Προσθέστε τιμή ή επιλέξτε «Τιμή κατόπιν επικοινωνίας».");
  if (!l.areaSqm) blockers.push("Προσθέστε το εμβαδόν.");
  if (included.length === 0) blockers.push("Προσθέστε τουλάχιστον μία φωτογραφία.");
  const approved = (key: string) => l.content.some((c) => c.key === key && c.lang === "el" && c.approved && c.text.trim());
  if (!approved("headline")) blockers.push("Εγκρίνετε ελληνικό τίτλο αγγελίας.");
  if (!approved("description")) blockers.push("Εγκρίνετε ελληνική περιγραφή.");
  if (!l.contactEmail && !l.contactPhone) blockers.push("Προσθέστε τουλάχιστον ένα στοιχείο επικοινωνίας.");
  const reachable =
    (l.contactEmail && l.showContactEmail) || (l.contactPhone && l.showContactPhone) || l.enquiriesEnabled;
  if (!reachable) blockers.push("Ενεργοποιήστε τουλάχιστον έναν τρόπο επικοινωνίας για τους ενδιαφερόμενους.");
  // Staged photos must be explicitly reviewed before they can be used.
  for (const p of included) {
    const v = p.selectedVariantId ? p.variants.find((x) => x.id === p.selectedVariantId) : null;
    if (v && v.kind === "STAGED" && !v.approvedAt) {
      blockers.push("Ελέγξτε και εγκρίνετε τις ψηφιακά επιπλωμένες φωτογραφίες πριν τη δημοσίευση.");
      break;
    }
  }
  return blockers;
}
