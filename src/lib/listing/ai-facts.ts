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
} from "./options";
import type { ListingDetails } from "./schema";
import { floorLabel, formatArea, formatDate, formatPrice, publicLocation } from "./format";

// Builds the ONLY information the AI model is allowed to use: a plain list of
// user-provided facts, an explicit list of unknown facts, and the user's own
// notes and limitations. The private street address is never included unless
// the owner chose to show it publicly.

export type FactsInput = {
  purpose: string | null;
  propertyType: string | null;
  title: string | null;
  region: string | null;
  municipality: string | null;
  neighborhood: string | null;
  address: string | null;
  postalCode: string | null;
  locationPrecision: string;
  price: number | null;
  priceOnRequest: boolean;
  areaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  availability: string | null;
  availableFrom: Date | null;
  details: ListingDetails;
  rooms: { room: string; roomLabel: string | null; count: number }[];
  hasFloorPlan: boolean;
  hasStagedPhotos: boolean;
};

export type FactSheet = { known: string[]; unknown: string[]; notes: string[]; text: string };

export function buildFactSheet(f: FactsInput): FactSheet {
  const known: string[] = [];
  const unknown: string[] = [];
  const notes: string[] = [];
  const d = f.details;
  const k = (label: string, value: string | null | undefined) => {
    if (value) known.push(`${label}: ${value}`);
  };
  const tri = (label: string, v: string | undefined, yes: string, no: string) => {
    if (v === "YES") known.push(`${label}: ${yes}`);
    else if (v === "NO") known.push(`${label}: ${no}`);
    else unknown.push(label);
  };

  k("Σκοπός", labelOf(PURPOSES, f.purpose as never));
  k("Τύπος ακινήτου", labelOf(PROPERTY_TYPES, f.propertyType as never));
  const loc = publicLocation(f);
  if (loc) known.push(`Τοποθεσία (όπως θα εμφανίζεται δημόσια): ${loc}`);
  else unknown.push("Τοποθεσία");
  if (f.price || f.priceOnRequest) k("Τιμή", formatPrice(f.price, f.priceOnRequest, f.purpose));
  else unknown.push("Τιμή");
  if (f.areaSqm) k("Εσωτερικό εμβαδόν", formatArea(f.areaSqm));
  else unknown.push("Εμβαδόν");
  if (f.bedrooms != null) k("Υπνοδωμάτια", String(f.bedrooms));
  else unknown.push("Αριθμός υπνοδωματίων");
  if (f.bathrooms != null) k("Μπάνια/WC", String(f.bathrooms));
  else unknown.push("Αριθμός μπάνιων");
  if (f.floor) k("Όροφος", floorLabel(f.floor));
  else if (f.propertyType !== "DETACHED_HOUSE") unknown.push("Όροφος");
  if (f.availability) {
    k(
      "Διαθεσιμότητα",
      f.availability === "FROM_DATE" && f.availableFrom
        ? `από ${formatDate(f.availableFrom)}`
        : labelOf(AVAILABILITY, f.availability as never),
    );
  }

  if (typeof d.yearBuilt === "number") k("Έτος κατασκευής", String(d.yearBuilt));
  else unknown.push("Έτος κατασκευής");
  if (d.renovated === "YES") {
    k("Ανακαίνιση", d.renovationYear ? `ναι, το ${d.renovationYear}` : "ναι (χωρίς δηλωμένο έτος)");
    if (d.renovationDescription) k("Τι ανακαινίστηκε (κατά δήλωση ιδιοκτήτη)", d.renovationDescription);
  } else if (d.renovated === "NO") known.push("Ανακαίνιση: όχι");
  else unknown.push("Αν έχει ανακαινιστεί");
  if (d.heating && d.heating !== "UNKNOWN") k("Θέρμανση", labelOf(HEATING, d.heating));
  else unknown.push("Τύπος θέρμανσης");
  if (d.airConditioning && d.airConditioning !== "UNKNOWN") k("Κλιματισμός", labelOf(AIR_CONDITIONING, d.airConditioning));
  if (d.energyClass && d.energyClass !== "UNKNOWN") k("Ενεργειακή κατηγορία", labelOf(ENERGY_CLASSES, d.energyClass));
  else unknown.push("Ενεργειακή κατηγορία");
  if (f.propertyType !== "DETACHED_HOUSE") tri("Ανελκυστήρας", d.elevator, "ναι", "όχι");
  if (d.parking && d.parking !== "UNKNOWN") {
    k("Στάθμευση", labelOf(PARKING, d.parking) + (d.parkingSpaces && d.parking !== "NONE" ? ` (${d.parkingSpaces} θέσεις)` : ""));
  } else unknown.push("Στάθμευση");
  tri("Αποθήκη", d.storage, "ναι", "όχι");
  if (d.outdoor === "YES") {
    const spaces = (d.outdoorSpaces ?? []).map((s) => labelOf(OUTDOOR_SPACES, s)).join(", ");
    k("Εξωτερικοί χώροι", `${spaces || "ναι"}${d.outdoorAreaSqm ? `, περίπου ${formatArea(d.outdoorAreaSqm)}` : ""}`);
  } else if (d.outdoor === "NO") known.push("Εξωτερικοί χώροι: δεν υπάρχουν");
  else unknown.push("Εξωτερικοί χώροι");
  if (d.furnished && d.furnished !== "UNKNOWN") k("Επίπλωση", labelOf(FURNISHED, d.furnished));
  if (d.orientation?.length) k("Προσανατολισμός", d.orientation.map((o) => labelOf(ORIENTATIONS, o)).join(", "));
  else unknown.push("Προσανατολισμός");
  if (d.view) k("Θέα (κατά δήλωση ιδιοκτήτη)", d.view);
  else unknown.push("Θέα (να ΜΗΝ αναφερθεί καθόλου)");
  if (d.accessibility?.length) k("Προσβασιμότητα", d.accessibility.map((a) => labelOf(ACCESSIBILITY, a)).join(", "));
  if (d.accessibilityNotes) k("Σημειώσεις προσβασιμότητας", d.accessibilityNotes);
  if (typeof d.commonCharges === "number") k("Μηνιαία κοινόχρηστα", `${d.commonCharges} €`);
  if (d.occupancy && d.occupancy !== "UNKNOWN") k("Κατάσταση χρήσης", labelOf(OCCUPANCY, d.occupancy));
  if (d.levels) k("Επίπεδα", String(d.levels));
  if (d.plotAreaSqm) k("Εμβαδόν οικοπέδου", formatArea(d.plotAreaSqm));
  if (d.extraFeatures?.length) k("Επιπλέον χαρακτηριστικά", d.extraFeatures.map((e) => labelOf(EXTRA_FEATURES, e)).join(", "));
  if (f.rooms.length) {
    k(
      "Χώροι με φωτογραφίες (κατά δήλωση χρήστη)",
      f.rooms.map((r) => r.roomLabel || labelOf(ROOM_TYPES, r.room as never)).join(", "),
    );
  }
  if (f.hasFloorPlan) known.push("Διατίθεται κάτοψη");
  if (d.otherFeatures) notes.push(`Άλλα χαρακτηριστικά (κείμενο ιδιοκτήτη): ${d.otherFeatures}`);
  if (d.limitations) notes.push(`ΣΗΜΑΝΤΙΚΟΙ ΠΕΡΙΟΡΙΣΜΟΙ που ΠΡΕΠΕΙ να αναφερθούν με σαφήνεια: ${d.limitations}`);
  if (f.hasStagedPhotos) {
    notes.push("Ορισμένες φωτογραφίες είναι ψηφιακά επιπλωμένες· μην περιγράψεις έπιπλα ή διακόσμηση από αυτές.");
  }

  const text = [
    "ΓΝΩΣΤΑ ΣΤΟΙΧΕΙΑ (επιβεβαιωμένα από τον χρήστη):",
    ...known.map((x) => `- ${x}`),
    "",
    "ΑΓΝΩΣΤΑ ΣΤΟΙΧΕΙΑ (μην τα αναφέρεις και μην τα μαντέψεις):",
    ...(unknown.length ? unknown.map((x) => `- ${x}`) : ["- (κανένα)"]),
    ...(notes.length ? ["", "ΣΗΜΕΙΩΣΕΙΣ ΧΡΗΣΤΗ:", ...notes.map((x) => `- ${x}`)] : []),
  ].join("\n");

  return { known, unknown, notes, text };
}
