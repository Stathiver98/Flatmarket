import "server-only";
import { buildFactSheet } from "@/lib/listing/ai-facts";
import { readDetails } from "@/lib/listing/schema";
import type { ListingFull } from "./queries";
import { presentedVersion } from "./presentation";

export function factSheetFor(l: ListingFull) {
  const included = l.photos.filter((p) => p.includeInListing);
  const rooms: { room: string; roomLabel: string | null; count: number }[] = [];
  for (const p of included) {
    if (!p.room) continue;
    const r = rooms.find((x) => x.room === p.room && x.roomLabel === p.roomLabel);
    if (r) r.count++;
    else rooms.push({ room: p.room, roomLabel: p.roomLabel, count: 1 });
  }
  return buildFactSheet({
    purpose: l.purpose,
    propertyType: l.propertyType,
    title: l.title,
    region: l.region,
    municipality: l.municipality,
    neighborhood: l.neighborhood,
    address: l.address,
    postalCode: l.postalCode,
    locationPrecision: l.locationPrecision,
    price: l.price,
    priceOnRequest: l.priceOnRequest,
    areaSqm: l.areaSqm,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    floor: l.floor,
    availability: l.availability,
    availableFrom: l.availableFrom,
    details: readDetails(l.details),
    rooms,
    hasFloorPlan: l.floorPlans.length > 0,
    hasStagedPhotos: included.some((p) => presentedVersion(p)?.kind === "STAGED"),
  });
}

/** Text used to verify generated claims: confirmed facts and user notes only. */
export function confirmedFactsText(l: ListingFull) {
  const sheet = factSheetFor(l);
  return [...sheet.known, ...sheet.notes, l.title ?? ""].join("\n");
}
