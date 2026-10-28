import {
  ACCESSIBILITY,
  AIR_CONDITIONING,
  AVAILABILITY,
  ENERGY_CLASSES,
  EXTRA_FEATURES,
  FURNISHED,
  HEATING,
  OCCUPANCY,
  ORIENTATIONS,
  OUTDOOR_SPACES,
  PARKING,
  PROPERTY_TYPES,
  PURPOSES,
  ROOM_TYPES,
  labelOf,
  type Lang,
} from "./options";
import type { ListingDetails } from "./schema";
import { floorLabel, formatArea, formatDate, formatNumber, formatPrice } from "./format";

// A serializable, self-contained view of a listing as it should be presented.
// The same structure powers the owner preview, the published snapshot (stored
// as JSON at publication time), the public page and the PDF brochure.

export type PresentationPhoto = {
  id: string;
  variantId: string | null;
  kind: "ORIGINAL" | "ENHANCED" | "STAGED";
  provider: string | null;
  room: string | null;
  roomLabel: string | null;
  caption: string | null;
  isCover: boolean;
  width: number;
  height: number;
};

export type PresentationContent = {
  headline: string | null;
  summary: string | null;
  description: string | null;
  features: string[];
  social: string | null;
};

export type Presentation = {
  version: 1;
  listingId: string;
  reference: string;
  purpose: string | null;
  propertyType: string | null;
  fallbackTitle: { el: string; en: string };
  location: string | null;
  price: number | null;
  priceOnRequest: boolean;
  areaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  availability: string | null;
  availableFrom: string | null;
  details: ListingDetails;
  content: { el: PresentationContent; en: PresentationContent };
  photos: PresentationPhoto[];
  floorPlans: {
    id: string;
    label: string | null;
    width: number;
    height: number;
    hotspots: { x: number; y: number; room: string; roomLabel: string | null }[];
  }[];
  tour: { url: string; embedUrl: string | null; providerName: string | null } | null;
  contact: { name: string | null; email: string | null; phone: string | null; enquiriesEnabled: boolean };
  branding: {
    workspaceId: string;
    displayName: string;
    hasLogo: boolean;
    website: string | null;
    registryNumber: string | null;
  } | null;
  updatedAt: string;
};

export function presentationTitle(p: Presentation, lang: Lang) {
  return p.content[lang].headline ?? p.content.el.headline ?? p.fallbackTitle[lang];
}

export function hasEnglish(p: Presentation) {
  return Boolean(p.content.en.headline || p.content.en.description);
}

export function coverPhoto(p: Presentation) {
  return p.photos.find((ph) => ph.isCover) ?? p.photos[0] ?? null;
}

export type FactRow = { label: string; value: string };

const L = (lang: Lang, el: string, en: string) => (lang === "el" ? el : en);

/** Key facts in display order. Only facts that were actually provided are included. */
export function keyFacts(p: Presentation, lang: Lang): FactRow[] {
  const rows: FactRow[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value) rows.push({ label, value });
  };
  push(L(lang, "Τύπος", "Type"), labelOf(PROPERTY_TYPES, p.propertyType as never, lang));
  push(L(lang, "Διάθεση", "Listing"), labelOf(PURPOSES, p.purpose as never, lang));
  push(L(lang, "Εμβαδόν", "Interior area"), formatArea(p.areaSqm, lang));
  if (p.bedrooms != null) push(L(lang, "Υπνοδωμάτια", "Bedrooms"), String(p.bedrooms));
  if (p.bathrooms != null) push(L(lang, "Μπάνια", "Bathrooms"), String(p.bathrooms));
  push(L(lang, "Όροφος", "Floor"), floorLabel(p.floor, lang));
  const d = p.details;
  if (typeof d.yearBuilt === "number") push(L(lang, "Έτος κατασκευής", "Year built"), String(d.yearBuilt));
  if (d.renovated === "YES") {
    push(L(lang, "Ανακαίνιση", "Renovated"), d.renovationYear ? String(d.renovationYear) : L(lang, "Ναι", "Yes"));
  }
  if (d.energyClass && d.energyClass !== "UNKNOWN") {
    push(L(lang, "Ενεργειακή κατηγορία", "Energy class"), labelOf(ENERGY_CLASSES, d.energyClass, lang));
  }
  if (d.heating && d.heating !== "UNKNOWN") push(L(lang, "Θέρμανση", "Heating"), labelOf(HEATING, d.heating, lang));
  if (d.airConditioning && d.airConditioning !== "UNKNOWN" && d.airConditioning !== "NONE") {
    push(L(lang, "Κλιματισμός", "Air conditioning"), labelOf(AIR_CONDITIONING, d.airConditioning, lang));
  }
  if (d.elevator === "YES") push(L(lang, "Ανελκυστήρας", "Lift"), L(lang, "Ναι", "Yes"));
  if (d.elevator === "NO") push(L(lang, "Ανελκυστήρας", "Lift"), L(lang, "Όχι", "No"));
  if (d.parking && d.parking !== "UNKNOWN") {
    const label = labelOf(PARKING, d.parking, lang);
    push(L(lang, "Στάθμευση", "Parking"), d.parkingSpaces && d.parking !== "NONE" ? `${label} × ${d.parkingSpaces}` : label);
  }
  if (d.storage === "YES") push(L(lang, "Αποθήκη", "Storage room"), L(lang, "Ναι", "Yes"));
  if (d.outdoor === "YES") {
    const spaces = (d.outdoorSpaces ?? []).map((s) => labelOf(OUTDOOR_SPACES, s, lang)).filter(Boolean).join(", ");
    const area = d.outdoorAreaSqm ? ` (${formatArea(d.outdoorAreaSqm, lang)})` : "";
    push(L(lang, "Εξωτερικοί χώροι", "Outdoor space"), (spaces || L(lang, "Ναι", "Yes")) + area);
  }
  if (d.plotAreaSqm) push(L(lang, "Οικόπεδο", "Plot"), formatArea(d.plotAreaSqm, lang));
  if (d.levels) push(L(lang, "Επίπεδα", "Levels"), String(d.levels));
  if (d.furnished && d.furnished !== "UNKNOWN") push(L(lang, "Επίπλωση", "Furnishing"), labelOf(FURNISHED, d.furnished, lang));
  if (d.orientation?.length) {
    push(L(lang, "Προσανατολισμός", "Orientation"), d.orientation.map((o) => labelOf(ORIENTATIONS, o, lang)).join(", "));
  }
  if (typeof d.commonCharges === "number") {
    push(L(lang, "Κοινόχρηστα", "Service charges"), `${formatNumber(d.commonCharges, lang)} € / ${L(lang, "μήνα", "month")}`);
  }
  if (d.occupancy && d.occupancy !== "UNKNOWN") push(L(lang, "Κατάσταση", "Occupancy"), labelOf(OCCUPANCY, d.occupancy, lang));
  if (p.availability) {
    const a = labelOf(AVAILABILITY, p.availability as never, lang);
    push(
      L(lang, "Διαθεσιμότητα", "Availability"),
      p.availability === "FROM_DATE" && p.availableFrom ? `${L(lang, "Από", "From")} ${formatDate(p.availableFrom, lang)}` : a,
    );
  }
  return rows;
}

export function priceText(p: Presentation, lang: Lang) {
  return formatPrice(p.price, p.priceOnRequest, p.purpose, lang);
}

/** Feature chips from structured answers (user-confirmed only). */
export function structuredFeatures(p: Presentation, lang: Lang): string[] {
  const d = p.details;
  const list: string[] = [];
  for (const f of d.extraFeatures ?? []) {
    const l = labelOf(EXTRA_FEATURES, f, lang);
    if (l) list.push(l);
  }
  for (const a of d.accessibility ?? []) {
    const l = labelOf(ACCESSIBILITY, a, lang);
    if (l) list.push(l);
  }
  return list;
}

/** Facts the owner has not provided (or marked unknown) that buyers commonly ask about. */
export function missingInformation(p: Presentation, lang: Lang): string[] {
  const d = p.details;
  const out: string[] = [];
  if (!d.energyClass || d.energyClass === "UNKNOWN") out.push(L(lang, "Ενεργειακή κατηγορία", "Energy class"));
  else if (d.energyClass === "PENDING") out.push(L(lang, "Ενεργειακή κατηγορία (το ΠΕΑ είναι υπό έκδοση)", "Energy class (certificate pending)"));
  if (!d.heating || d.heating === "UNKNOWN") out.push(L(lang, "Τύπος θέρμανσης", "Heating type"));
  if (d.yearBuilt == null || d.yearBuilt === "UNKNOWN") out.push(L(lang, "Έτος κατασκευής", "Year built"));
  if (p.propertyType !== "DETACHED_HOUSE" && (d.commonCharges == null || d.commonCharges === "UNKNOWN")) {
    out.push(L(lang, "Μηνιαία κοινόχρηστα", "Monthly service charges"));
  }
  return out;
}

export function roomLabel(room: string | null, custom: string | null, lang: Lang) {
  if (custom) return custom;
  return labelOf(ROOM_TYPES, room as never, lang) ?? L(lang, "Χωρίς χώρο", "Unassigned");
}

/** Groups photos by room (in the order the rooms first appear). */
export function photosByRoom(p: Presentation, lang: Lang) {
  const groups: { key: string; room: string | null; label: string; photos: PresentationPhoto[] }[] = [];
  for (const ph of p.photos) {
    const key = `${ph.room ?? "NONE"}|${ph.roomLabel ?? ""}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, room: ph.room, label: roomLabel(ph.room, ph.roomLabel, lang), photos: [] };
      groups.push(g);
    }
    g.photos.push(ph);
  }
  return groups;
}

export function roomAnchor(room: string | null, custom: string | null) {
  return `room-${(room ?? "none").toLowerCase()}-${(custom ?? "").toLowerCase().replace(/[^a-z0-9α-ωάέήίόύώ]+/gi, "-")}`;
}
