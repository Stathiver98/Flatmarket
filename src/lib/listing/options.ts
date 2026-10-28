// Option lists and bilingual labels for listing fields. Greek is primary;
// English labels are used on the English version of presentation pages/PDFs.

export type Lang = "el" | "en";
export type Option<T extends string = string> = { value: T; el: string; en: string };

function opts<T extends string>(list: Option<T>[]) {
  return list;
}

export function labelOf<T extends string>(list: Option<T>[], value: T | null | undefined, lang: Lang = "el") {
  if (value == null) return null;
  const o = list.find((x) => x.value === value);
  return o ? o[lang] : null;
}

export const PURPOSES = opts([
  { value: "SALE", el: "Πώληση", en: "For sale" },
  { value: "RENT", el: "Ενοικίαση", en: "For rent" },
] as const satisfies Option[]);

export const PROPERTY_TYPES = opts([
  { value: "APARTMENT", el: "Διαμέρισμα", en: "Apartment" },
  { value: "MAISONETTE", el: "Μεζονέτα", en: "Maisonette" },
  { value: "DETACHED_HOUSE", el: "Μονοκατοικία", en: "Detached house" },
  { value: "STUDIO", el: "Γκαρσονιέρα / Studio", en: "Studio" },
  { value: "OTHER_RESIDENTIAL", el: "Άλλη κατοικία", en: "Other residential" },
] as const satisfies Option[]);

export const ROOM_TYPES = opts([
  { value: "LIVING_ROOM", el: "Σαλόνι", en: "Living room" },
  { value: "KITCHEN", el: "Κουζίνα", en: "Kitchen" },
  { value: "BEDROOM", el: "Υπνοδωμάτιο", en: "Bedroom" },
  { value: "BATHROOM", el: "Μπάνιο", en: "Bathroom" },
  { value: "BALCONY", el: "Μπαλκόνι / Βεράντα", en: "Balcony / terrace" },
  { value: "EXTERIOR", el: "Εξωτερικός χώρος", en: "Exterior" },
  { value: "OTHER", el: "Άλλος χώρος", en: "Other space" },
] as const satisfies Option[]);

export const LOCATION_PRECISIONS = opts([
  { value: "REGION", el: "Μόνο περιφέρεια / νομός", en: "Region only" },
  { value: "MUNICIPALITY", el: "Δήμος", en: "Municipality" },
  { value: "AREA", el: "Δήμος και περιοχή", en: "Municipality and neighbourhood" },
  { value: "EXACT", el: "Πλήρης διεύθυνση", en: "Full address" },
] as const satisfies Option[]);

export const FLOORS = opts([
  { value: "BASEMENT", el: "Υπόγειο", en: "Basement" },
  { value: "SEMI_BASEMENT", el: "Ημιυπόγειο", en: "Semi-basement" },
  { value: "GROUND", el: "Ισόγειο", en: "Ground floor" },
  { value: "RAISED_GROUND", el: "Υπερυψωμένο ισόγειο", en: "Raised ground floor" },
  { value: "MEZZANINE", el: "Ημιώροφος", en: "Mezzanine" },
  ...Array.from({ length: 15 }, (_, i) => ({
    value: String(i + 1),
    el: `${i + 1}ος όροφος`,
    en: `${ordinalEn(i + 1)} floor`,
  })),
  { value: "MULTI", el: "Πολλαπλά επίπεδα", en: "Multiple levels" },
] satisfies Option[]);

function ordinalEn(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const AVAILABILITY = opts([
  { value: "IMMEDIATE", el: "Άμεσα διαθέσιμο", en: "Available immediately" },
  { value: "FROM_DATE", el: "Διαθέσιμο από συγκεκριμένη ημερομηνία", en: "Available from a specific date" },
  { value: "BY_ARRANGEMENT", el: "Κατόπιν συνεννόησης", en: "By arrangement" },
] as const satisfies Option[]);

export const TRI_STATE = opts([
  { value: "YES", el: "Ναι", en: "Yes" },
  { value: "NO", el: "Όχι", en: "No" },
  { value: "UNKNOWN", el: "Δεν είναι γνωστό", en: "Unknown" },
] as const satisfies Option[]);

export const HEATING = opts([
  { value: "AUTONOMOUS_OIL", el: "Αυτόνομη θέρμανση πετρελαίου", en: "Independent oil heating" },
  { value: "CENTRAL_OIL", el: "Κεντρική θέρμανση πετρελαίου", en: "Central oil heating" },
  { value: "AUTONOMOUS_GAS", el: "Αυτόνομη θέρμανση φυσικού αερίου", en: "Independent natural gas heating" },
  { value: "CENTRAL_GAS", el: "Κεντρική θέρμανση φυσικού αερίου", en: "Central natural gas heating" },
  { value: "HEAT_PUMP", el: "Αντλία θερμότητας", en: "Heat pump" },
  { value: "AIR_CONDITIONERS", el: "Κλιματιστικά (θέρμανση)", en: "Air conditioning units (heating)" },
  { value: "UNDERFLOOR", el: "Ενδοδαπέδια θέρμανση", en: "Underfloor heating" },
  { value: "STORAGE_HEATERS", el: "Θερμοσυσσωρευτές", en: "Storage heaters" },
  { value: "STOVE_FIREPLACE", el: "Σόμπα / τζάκι", en: "Stove / fireplace" },
  { value: "ELECTRIC", el: "Ηλεκτρική θέρμανση", en: "Electric heating" },
  { value: "NONE", el: "Χωρίς θέρμανση", en: "No heating" },
  { value: "UNKNOWN", el: "Δεν είναι γνωστό", en: "Unknown" },
] as const satisfies Option[]);

export const AIR_CONDITIONING = opts([
  { value: "ALL_ROOMS", el: "Σε όλους τους χώρους", en: "In all rooms" },
  { value: "SOME_ROOMS", el: "Σε ορισμένους χώρους", en: "In some rooms" },
  { value: "NONE", el: "Όχι", en: "None" },
  { value: "UNKNOWN", el: "Δεν είναι γνωστό", en: "Unknown" },
] as const satisfies Option[]);

export const ENERGY_CLASSES = opts([
  { value: "A_PLUS", el: "Α+", en: "A+" },
  { value: "A", el: "Α", en: "A" },
  { value: "B_PLUS", el: "Β+", en: "B+" },
  { value: "B", el: "Β", en: "B" },
  { value: "C", el: "Γ", en: "C" },
  { value: "D", el: "Δ", en: "D" },
  { value: "E", el: "Ε", en: "E" },
  { value: "Z", el: "Ζ", en: "F" },
  { value: "H", el: "Η", en: "G" },
  { value: "PENDING", el: "Υπό έκδοση", en: "Certificate pending" },
  { value: "EXEMPT", el: "Εξαιρείται", en: "Exempt" },
  { value: "UNKNOWN", el: "Δεν είναι γνωστό", en: "Unknown" },
] as const satisfies Option[]);

export const PARKING = opts([
  { value: "NONE", el: "Χωρίς θέση στάθμευσης", en: "No parking" },
  { value: "PILOTIS", el: "Θέση σε πυλωτή", en: "Covered space (pilotis)" },
  { value: "GARAGE", el: "Κλειστό γκαράζ", en: "Closed garage" },
  { value: "UNDERGROUND", el: "Υπόγεια θέση", en: "Underground space" },
  { value: "OUTDOOR", el: "Υπαίθρια θέση", en: "Outdoor space" },
  { value: "UNKNOWN", el: "Δεν είναι γνωστό", en: "Unknown" },
] as const satisfies Option[]);

export const OUTDOOR_SPACES = opts([
  { value: "BALCONY", el: "Μπαλκόνι", en: "Balcony" },
  { value: "TERRACE", el: "Βεράντα / ταράτσα", en: "Terrace" },
  { value: "GARDEN", el: "Κήπος", en: "Garden" },
  { value: "YARD", el: "Αυλή", en: "Yard" },
] as const satisfies Option[]);

export const FURNISHED = opts([
  { value: "FURNISHED", el: "Επιπλωμένο", en: "Furnished" },
  { value: "PARTIALLY", el: "Μερικώς επιπλωμένο", en: "Partly furnished" },
  { value: "UNFURNISHED", el: "Χωρίς έπιπλα", en: "Unfurnished" },
  { value: "UNKNOWN", el: "Δεν είναι γνωστό", en: "Unknown" },
] as const satisfies Option[]);

export const ORIENTATIONS = opts([
  { value: "N", el: "Βόρειος", en: "North" },
  { value: "NE", el: "Βορειοανατολικός", en: "North-east" },
  { value: "E", el: "Ανατολικός", en: "East" },
  { value: "SE", el: "Νοτιοανατολικός", en: "South-east" },
  { value: "S", el: "Νότιος", en: "South" },
  { value: "SW", el: "Νοτιοδυτικός", en: "South-west" },
  { value: "W", el: "Δυτικός", en: "West" },
  { value: "NW", el: "Βορειοδυτικός", en: "North-west" },
] as const satisfies Option[]);

export const ACCESSIBILITY = opts([
  { value: "STEP_FREE_ENTRANCE", el: "Είσοδος χωρίς σκαλοπάτια", en: "Step-free entrance" },
  { value: "LIFT_ACCESS", el: "Πρόσβαση με ανελκυστήρα", en: "Lift access" },
  { value: "WIDE_DOORS", el: "Φαρδιές πόρτες", en: "Wide doorways" },
  { value: "ACCESSIBLE_BATHROOM", el: "Προσβάσιμο μπάνιο", en: "Accessible bathroom" },
  { value: "SINGLE_LEVEL", el: "Όλοι οι χώροι σε ένα επίπεδο", en: "All rooms on one level" },
] as const satisfies Option[]);

export const OCCUPANCY = opts([
  { value: "VACANT", el: "Κενό", en: "Vacant" },
  { value: "OWNER_OCCUPIED", el: "Ιδιοκατοικείται", en: "Owner-occupied" },
  { value: "TENANTED", el: "Μισθωμένο", en: "Tenanted" },
  { value: "UNKNOWN", el: "Δεν είναι γνωστό", en: "Unknown" },
] as const satisfies Option[]);

export const EXTRA_FEATURES = opts([
  { value: "SECURITY_DOOR", el: "Πόρτα ασφαλείας", en: "Security door" },
  { value: "DOUBLE_GLAZING", el: "Διπλά τζάμια", en: "Double glazing" },
  { value: "AWNINGS", el: "Τέντες", en: "Awnings" },
  { value: "INSECT_SCREENS", el: "Σίτες", en: "Insect screens" },
  { value: "FIREPLACE", el: "Τζάκι", en: "Fireplace" },
  { value: "SOLAR_WATER_HEATER", el: "Ηλιακός θερμοσίφωνας", en: "Solar water heater" },
  { value: "ALARM", el: "Συναγερμός", en: "Alarm system" },
  { value: "THROUGH", el: "Διαμπερές", en: "Dual aspect" },
  { value: "CORNER", el: "Γωνιακό", en: "Corner property" },
  { value: "PENTHOUSE", el: "Ρετιρέ", en: "Penthouse" },
  { value: "INTERNAL_STAIRCASE", el: "Εσωτερική σκάλα", en: "Internal staircase" },
  { value: "POOL", el: "Πισίνα", en: "Swimming pool" },
  { value: "PETS_ALLOWED", el: "Επιτρέπονται κατοικίδια", en: "Pets allowed" },
  { value: "STUDENT_FRIENDLY", el: "Κατάλληλο για φοιτητές", en: "Suitable for students" },
] as const satisfies Option[]);

export const LISTING_STATUSES = opts([
  { value: "DRAFT", el: "Πρόχειρο", en: "Draft" },
  { value: "AWAITING_REVIEW", el: "Σε έλεγχο", en: "Awaiting review" },
  { value: "READY", el: "Έτοιμο", en: "Ready" },
  { value: "PUBLISHED", el: "Δημοσιευμένο", en: "Published" },
  { value: "ARCHIVED", el: "Αρχειοθετημένο", en: "Archived" },
] as const satisfies Option[]);

export const VISIBILITIES = opts([
  { value: "PRIVATE", el: "Ιδιωτικό — μόνο εσείς", en: "Private" },
  { value: "UNLISTED", el: "Μόνο με σύνδεσμο", en: "Link only" },
  { value: "PUBLIC", el: "Δημόσιο", en: "Public" },
] as const satisfies Option[]);

export const CONTENT_KEYS = ["headline", "summary", "description", "features", "social"] as const;
export type ContentKey = (typeof CONTENT_KEYS)[number];

export const CONTENT_KEY_LABELS: Record<ContentKey, { el: string; hint: string }> = {
  headline: { el: "Τίτλος αγγελίας", hint: "Έως 90 χαρακτήρες. Σαφής και χωρίς υπερβολές." },
  summary: { el: "Σύντομη περιγραφή", hint: "2–3 προτάσεις για τις λίστες αγγελιών και την κοινοποίηση." },
  description: { el: "Πλήρης περιγραφή", hint: "Η κύρια περιγραφή του ακινήτου." },
  features: { el: "Βασικά χαρακτηριστικά", hint: "Ένα χαρακτηριστικό ανά γραμμή." },
  social: { el: "Λεζάντα για social media", hint: "Σύντομο κείμενο για Facebook / Instagram." },
};
