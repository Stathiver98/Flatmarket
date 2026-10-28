import { z } from "zod";
import {
  ACCESSIBILITY,
  AIR_CONDITIONING,
  AVAILABILITY,
  ENERGY_CLASSES,
  EXTRA_FEATURES,
  FLOORS,
  FURNISHED,
  HEATING,
  LOCATION_PRECISIONS,
  OCCUPANCY,
  ORIENTATIONS,
  OUTDOOR_SPACES,
  PARKING,
  PROPERTY_TYPES,
  PURPOSES,
  ROOM_TYPES,
  TRI_STATE,
  type Option,
} from "./options";

// Validation for listing data. Every field is optional so drafts can be saved
// at any point; the completeness indicator reports what is still missing.

function enumOf<T extends string>(list: readonly Option<T>[]) {
  return z.enum(list.map((o) => o.value) as [T, ...T[]]);
}

const currentYear = new Date().getFullYear();

export const purposeSchema = enumOf(PURPOSES);
export const propertyTypeSchema = enumOf(PROPERTY_TYPES);
export const roomTypeSchema = enumOf(ROOM_TYPES);

const shortText = (max: number) => z.string().trim().max(max, `Έως ${max} χαρακτήρες.`);

export const basicsSchema = z.object({
  purpose: purposeSchema.nullable(),
  propertyType: propertyTypeSchema.nullable(),
  title: shortText(120).nullable(),
  region: shortText(100).nullable(),
  municipality: shortText(100).nullable(),
  neighborhood: shortText(100).nullable(),
  address: shortText(200).nullable(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{3}\s?\d{2}$/, "Ο ταχυδρομικός κώδικας έχει 5 ψηφία.")
    .nullable(),
  locationPrecision: enumOf(LOCATION_PRECISIONS),
  price: z.number().int().min(1, "Η τιμή πρέπει να είναι θετική.").max(100_000_000, "Η τιμή φαίνεται λανθασμένη.").nullable(),
  priceOnRequest: z.boolean(),
  areaSqm: z.number().min(5, "Το εμβαδόν φαίνεται πολύ μικρό.").max(10_000, "Το εμβαδόν φαίνεται λανθασμένο.").nullable(),
  bedrooms: z.number().int().min(0).max(50).nullable(),
  bathrooms: z.number().int().min(0).max(50).nullable(),
  floor: enumOf(FLOORS).nullable(),
  availability: enumOf(AVAILABILITY).nullable(),
  availableFrom: z.date().nullable(),
});
export type BasicsInput = z.infer<typeof basicsSchema>;

const yearSchema = z
  .number()
  .int()
  .min(1800, "Το έτος φαίνεται λανθασμένο.")
  .max(currentYear + 5, "Το έτος φαίνεται λανθασμένο.");

export const detailsSchema = z.object({
  yearBuilt: z.union([yearSchema, z.literal("UNKNOWN")]).optional(),
  renovated: enumOf(TRI_STATE).optional(),
  renovationYear: yearSchema.optional(),
  renovationDescription: shortText(1000).optional(),
  heating: enumOf(HEATING).optional(),
  airConditioning: enumOf(AIR_CONDITIONING).optional(),
  energyClass: enumOf(ENERGY_CLASSES).optional(),
  elevator: enumOf(TRI_STATE).optional(),
  parking: enumOf(PARKING).optional(),
  parkingSpaces: z.number().int().min(1).max(20).optional(),
  storage: enumOf(TRI_STATE).optional(),
  outdoor: enumOf(TRI_STATE).optional(),
  outdoorSpaces: z.array(enumOf(OUTDOOR_SPACES)).max(10).optional(),
  outdoorAreaSqm: z.number().min(0.5).max(100_000).optional(),
  furnished: enumOf(FURNISHED).optional(),
  orientation: z.array(enumOf(ORIENTATIONS)).max(8).optional(),
  orientationUnknown: z.boolean().optional(),
  view: shortText(300).optional(),
  accessibility: z.array(enumOf(ACCESSIBILITY)).max(10).optional(),
  accessibilityNotes: shortText(500).optional(),
  commonCharges: z.union([z.number().min(0).max(100_000), z.literal("UNKNOWN")]).optional(),
  occupancy: enumOf(OCCUPANCY).optional(),
  extraFeatures: z.array(enumOf(EXTRA_FEATURES)).max(30).optional(),
  levels: z.number().int().min(1).max(10).optional(),
  plotAreaSqm: z.number().min(1).max(1_000_000).optional(),
  otherFeatures: shortText(2000).optional(),
  limitations: shortText(2000).optional(),
});
export type ListingDetails = z.infer<typeof detailsSchema>;

/** Parses stored JSON defensively: invalid keys are dropped rather than crashing a page. */
export function readDetails(raw: unknown): ListingDetails {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = {};
  const shape = detailsSchema.shape as Record<string, z.ZodType>;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const field = shape[k];
    if (!field) continue;
    const r = field.safeParse(v);
    if (r.success && r.data !== undefined) out[k] = r.data;
  }
  return out as ListingDetails;
}

// ---- Form parsing helpers (FormData -> typed values) ----------------------

export function formStr(fd: FormData, name: string): string | null {
  const v = fd.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** Parses Greek-formatted integers such as "185.000" or "185 000 €". */
export function parseIntLoose(v: string | null): number | null | "invalid" {
  if (v == null) return null;
  const digits = v.replace(/[\s.€]/g, "").replace(/,\d{1,2}$/, "");
  if (!/^\d+$/.test(digits)) return "invalid";
  return Number(digits);
}

/** Parses decimals such as "85,5" or "85.5". */
export function parseDecimalLoose(v: string | null): number | null | "invalid" {
  if (v == null) return null;
  const s = v.replace(/\s/g, "").replace(/m²|τ\.?μ\.?/gi, "");
  const normalized = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : "invalid";
}

export function formBool(fd: FormData, name: string): boolean {
  const v = fd.get(name);
  return v === "on" || v === "true" || v === "1";
}

export function formList(fd: FormData, name: string): string[] {
  return fd
    .getAll(name)
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .map((v) => v.trim());
}
