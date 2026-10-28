import { FLOORS, LOCATION_PRECISIONS, PROPERTY_TYPES, PURPOSES, labelOf, type Lang } from "./options";

const LOCALE: Record<Lang, string> = { el: "el-GR", en: "en-GB" };

export function formatPrice(price: number | null, priceOnRequest: boolean, purpose: string | null, lang: Lang = "el") {
  if (priceOnRequest || price == null) return lang === "el" ? "Τιμή κατόπιν επικοινωνίας" : "Price on request";
  const amount = new Intl.NumberFormat(LOCALE[lang], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
  if (purpose === "RENT") return lang === "el" ? `${amount} / μήνα` : `${amount} / month`;
  return amount;
}

export function formatArea(area: number | null, lang: Lang = "el") {
  if (area == null) return null;
  const n = new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 1 }).format(area);
  return `${n} m²`;
}

export function formatNumber(n: number, lang: Lang = "el") {
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}

export function formatDate(d: Date | string | null, lang: Lang = "el") {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatDateTime(d: Date | string | null, lang: Lang = "el") {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(LOCALE[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Athens",
  }).format(date);
}

export function floorLabel(floor: string | null, lang: Lang = "el") {
  return labelOf(FLOORS, floor, lang);
}

export type LocationParts = {
  region: string | null;
  municipality: string | null;
  neighborhood: string | null;
  address: string | null;
  postalCode: string | null;
  locationPrecision: string;
};

/**
 * Location text shown publicly. Respects the owner's privacy choice: the
 * street address is only included with the explicit "EXACT" setting.
 */
export function publicLocation(l: LocationParts): string | null {
  const parts: (string | null)[] = [];
  switch (l.locationPrecision) {
    case "EXACT":
      parts.push(l.address, l.neighborhood, l.municipality, l.region);
      break;
    case "AREA":
      parts.push(l.neighborhood, l.municipality, l.region);
      break;
    case "MUNICIPALITY":
      parts.push(l.municipality, l.region);
      break;
    default:
      parts.push(l.region);
  }
  const unique = parts.filter((p): p is string => Boolean(p)).filter((p, i, a) => a.indexOf(p) === i);
  return unique.length ? unique.join(", ") : null;
}

export function precisionLabel(p: string) {
  return labelOf(LOCATION_PRECISIONS, p as never) ?? p;
}

/** Fallback title when the user has not written or approved a headline. */
export function defaultTitle(
  l: { propertyType: string | null; purpose: string | null; areaSqm: number | null; municipality: string | null; neighborhood: string | null },
  lang: Lang = "el",
) {
  const type = labelOf(PROPERTY_TYPES, l.propertyType as never, lang) ?? (lang === "el" ? "Ακίνητο" : "Property");
  const purpose = labelOf(PURPOSES, l.purpose as never, lang);
  const area = l.areaSqm ? ` ${formatArea(l.areaSqm, lang)}` : "";
  const place = l.neighborhood || l.municipality;
  const where = place ? (lang === "el" ? `, ${place}` : `, ${place}`) : "";
  const prefix = purpose ? `${purpose}: ` : "";
  return `${prefix}${type}${area}${where}`;
}

export function slugify(input: string) {
  const map: Record<string, string> = {
    α: "a", ά: "a", β: "v", γ: "g", δ: "d", ε: "e", έ: "e", ζ: "z", η: "i", ή: "i", θ: "th", ι: "i", ί: "i", ϊ: "i", ΐ: "i",
    κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", ό: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", ύ: "y", ϋ: "y",
    ΰ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o", ώ: "o",
  };
  return input
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
