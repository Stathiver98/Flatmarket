import type { ListingDetails } from "./schema";
import type { ListingStepId } from "./steps";

// Listing Completeness: a deterministic measure of how much information has
// been provided. It is NOT a valuation or a quality rating of the property.
//
// Rules:
// - Core items are needed for a clear, usable listing.
// - Optional items add useful detail; they weigh less.
// - An explicit "Unknown" answer counts as answered: users are not penalised
//   for facts they genuinely do not know. We still show a gentle reminder.
// - Items that do not apply to the property type are skipped entirely.

export type CompletenessInput = {
  purpose: string | null;
  propertyType: string | null;
  region: string | null;
  municipality: string | null;
  price: number | null;
  priceOnRequest: boolean;
  areaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: string | null;
  availability: string | null;
  details: ListingDetails;
  photos: { room: string | null; includeInListing: boolean; isCover: boolean }[];
  floorPlanCount: number;
  content: { key: string; lang: string; approved: boolean; text: string }[];
  contactEmail: string | null;
  contactPhone: string | null;
};

export type CompletenessItem = {
  id: string;
  group: "core" | "optional";
  label: string;
  state: "done" | "unknown" | "missing";
  suggestion: string;
  step: ListingStepId;
};

export type CompletenessResult = {
  score: number; // 0-100, weighted
  core: { done: number; total: number; percent: number };
  optional: { done: number; total: number; percent: number };
  items: CompletenessItem[];
  missingCore: CompletenessItem[];
  suggestions: CompletenessItem[];
};

export const MIN_PHOTOS = 5;
const CORE_WEIGHT = 0.75;

export function computeCompleteness(l: CompletenessInput): CompletenessResult {
  const items: CompletenessItem[] = [];
  const d = l.details;
  const type = l.propertyType;
  const isDetached = type === "DETACHED_HOUSE";
  const inBuilding = type !== "DETACHED_HOUSE"; // apartment, maisonette, studio, other
  const photos = l.photos.filter((p) => p.includeInListing);
  const hasContent = (key: string, lang: string) =>
    l.content.some((c) => c.key === key && c.lang === lang && c.approved && c.text.trim().length > 0);

  const add = (
    group: CompletenessItem["group"],
    id: string,
    label: string,
    state: CompletenessItem["state"],
    suggestion: string,
    step: ListingStepId,
  ) => items.push({ id, group, label, state, suggestion, step });
  const known = (v: unknown) => (v === undefined || v === null || v === "" ? "missing" : v === "UNKNOWN" ? "unknown" : "done");

  // ---- Core ----
  add("core", "purpose", "Σκοπός αγγελίας", l.purpose ? "done" : "missing", "Επιλέξτε αν πρόκειται για πώληση ή ενοικίαση.", "basics");
  add("core", "propertyType", "Τύπος ακινήτου", l.propertyType ? "done" : "missing", "Επιλέξτε τον τύπο του ακινήτου.", "basics");
  add(
    "core",
    "location",
    "Περιοχή",
    l.region && l.municipality ? "done" : "missing",
    "Συμπληρώστε περιφέρεια/νομό και δήμο.",
    "basics",
  );
  add(
    "core",
    "price",
    l.purpose === "RENT" ? "Μίσθωμα" : "Τιμή",
    l.price || l.priceOnRequest ? "done" : "missing",
    "Προσθέστε την τιμή ή επιλέξτε «Τιμή κατόπιν επικοινωνίας».",
    "basics",
  );
  add("core", "area", "Εμβαδόν", l.areaSqm ? "done" : "missing", "Προσθέστε το εσωτερικό εμβαδόν σε τ.μ.", "basics");
  add("core", "bedrooms", "Υπνοδωμάτια", l.bedrooms != null ? "done" : "missing", "Προσθέστε τον αριθμό υπνοδωματίων.", "basics");
  add("core", "bathrooms", "Μπάνια", l.bathrooms != null ? "done" : "missing", "Προσθέστε τον αριθμό μπάνιων/WC.", "basics");
  if (inBuilding) {
    add("core", "floor", "Όροφος", l.floor ? "done" : "missing", "Προσθέστε τον όροφο.", "basics");
  }
  add("core", "availability", "Διαθεσιμότητα", l.availability ? "done" : "missing", "Προσθέστε πότε είναι διαθέσιμο το ακίνητο.", "basics");
  add(
    "core",
    "photos",
    `Τουλάχιστον ${MIN_PHOTOS} φωτογραφίες`,
    photos.length >= MIN_PHOTOS ? "done" : "missing",
    photos.length === 0
      ? "Ανεβάστε φωτογραφίες του ακινήτου."
      : `Έχετε ${photos.length} φωτογραφίες· προσθέστε τουλάχιστον ${MIN_PHOTOS - photos.length} ακόμη.`,
    "photos",
  );
  if (photos.length > 0) {
    add("core", "cover", "Φωτογραφία εξωφύλλου", photos.some((p) => p.isCover) ? "done" : "missing", "Επιλέξτε φωτογραφία εξωφύλλου.", "photos");
    const unassigned = photos.filter((p) => !p.room).length;
    add(
      "core",
      "rooms",
      "Αντιστοίχιση φωτογραφιών σε χώρους",
      unassigned === 0 ? "done" : "missing",
      `Αντιστοιχίστε ${unassigned === 1 ? "1 φωτογραφία" : `${unassigned} φωτογραφίες`} σε χώρο.`,
      "photos",
    );
  }
  add(
    "core",
    "descriptionEl",
    "Εγκεκριμένη ελληνική περιγραφή",
    hasContent("headline", "el") && hasContent("description", "el") ? "done" : "missing",
    "Γράψτε ή δημιουργήστε και εγκρίνετε τίτλο και περιγραφή στα ελληνικά.",
    "content",
  );
  add(
    "core",
    "contact",
    "Στοιχεία επικοινωνίας",
    l.contactEmail || l.contactPhone ? "done" : "missing",
    "Προσθέστε email ή τηλέφωνο επικοινωνίας για την αγγελία.",
    "review",
  );

  // ---- Optional ----
  const yb = known(d.yearBuilt);
  add("optional", "yearBuilt", "Έτος κατασκευής", yb, yb === "unknown" ? "Αν βρείτε το έτος κατασκευής, προσθέστε το." : "Προσθέστε το έτος κατασκευής.", "details");
  const heat = known(d.heating);
  add("optional", "heating", "Θέρμανση", heat, heat === "unknown" ? "Επιβεβαιώστε τον τύπο θέρμανσης, αν είναι δυνατόν." : "Προσθέστε τον τύπο θέρμανσης.", "details");
  const energy = known(d.energyClass);
  add(
    "optional",
    "energyClass",
    "Ενεργειακή κατηγορία (ΠΕΑ)",
    energy,
    energy === "unknown"
      ? "Επιβεβαιώστε το πιστοποιητικό ενεργειακής απόδοσης — συνήθως ζητείται στις αγγελίες."
      : "Προσθέστε την ενεργειακή κατηγορία από το ΠΕΑ.",
    "details",
  );
  if (inBuilding && type !== "MAISONETTE") {
    add("optional", "elevator", "Ανελκυστήρας", known(d.elevator), "Δηλώστε αν υπάρχει ανελκυστήρας.", "details");
  }
  add("optional", "parking", "Στάθμευση", known(d.parking), "Δηλώστε αν υπάρχει θέση στάθμευσης.", "details");
  add("optional", "outdoor", "Εξωτερικοί χώροι", known(d.outdoor), "Δηλώστε αν υπάρχει μπαλκόνι, βεράντα ή κήπος.", "details");
  if (l.purpose === "RENT") {
    add("optional", "furnished", "Επίπλωση", known(d.furnished), "Δηλώστε αν το ακίνητο ενοικιάζεται επιπλωμένο.", "details");
  }
  add(
    "optional",
    "orientation",
    "Προσανατολισμός",
    d.orientation && d.orientation.length > 0 ? "done" : d.orientationUnknown ? "unknown" : "missing",
    "Προσθέστε τον προσανατολισμό.",
    "details",
  );
  if (inBuilding) {
    add("optional", "commonCharges", "Κοινόχρηστα", known(d.commonCharges), "Προσθέστε τα μηνιαία κοινόχρηστα, αν είναι γνωστά.", "details");
  }
  if (l.purpose === "SALE") {
    add("optional", "occupancy", "Κατάσταση χρήσης", known(d.occupancy), "Δηλώστε αν το ακίνητο είναι κενό ή μισθωμένο.", "details");
  }
  if (d.renovated === "YES") {
    add(
      "optional",
      "renovation",
      "Στοιχεία ανακαίνισης",
      d.renovationYear || d.renovationDescription ? "done" : "missing",
      "Περιγράψτε τι ανακαινίστηκε και πότε.",
      "details",
    );
  } else {
    add("optional", "renovatedAnswered", "Ανακαίνιση", known(d.renovated), "Δηλώστε αν το ακίνητο έχει ανακαινιστεί.", "details");
  }
  if (isDetached) {
    add("optional", "plot", "Εμβαδόν οικοπέδου", d.plotAreaSqm ? "done" : "missing", "Προσθέστε το εμβαδόν του οικοπέδου, αν είναι γνωστό.", "details");
  }
  add("optional", "floorPlan", "Κάτοψη", l.floorPlanCount > 0 ? "done" : "missing", "Προσθέστε κάτοψη, αν είναι διαθέσιμη.", "floor-plan");
  const roomPhoto = (room: string) => photos.some((p) => p.room === room);
  if (photos.length > 0) {
    add("optional", "photoLiving", "Φωτογραφία σαλονιού", roomPhoto("LIVING_ROOM") ? "done" : "missing", "Προσθέστε φωτογραφία του σαλονιού.", "photos");
    add("optional", "photoKitchen", "Φωτογραφία κουζίνας", roomPhoto("KITCHEN") ? "done" : "missing", "Προσθέστε φωτογραφία της κουζίνας.", "photos");
    if ((l.bedrooms ?? 0) > 0) {
      add("optional", "photoBedroom", "Φωτογραφία υπνοδωματίου", roomPhoto("BEDROOM") ? "done" : "missing", "Προσθέστε φωτογραφία υπνοδωματίου.", "photos");
    }
    add("optional", "photoBathroom", "Φωτογραφία μπάνιου", roomPhoto("BATHROOM") ? "done" : "missing", "Προσθέστε φωτογραφία του μπάνιου.", "photos");
  }
  add(
    "optional",
    "summaryEl",
    "Σύντομη περιγραφή",
    hasContent("summary", "el") ? "done" : "missing",
    "Προσθέστε σύντομη περιγραφή για κοινοποίηση.",
    "content",
  );
  add(
    "optional",
    "descriptionEn",
    "Αγγλική περιγραφή",
    hasContent("headline", "en") && hasContent("description", "en") ? "done" : "missing",
    "Προσθέστε αγγλικό τίτλο και περιγραφή για διεθνείς ενδιαφερόμενους.",
    "content",
  );

  const tally = (group: "core" | "optional") => {
    const g = items.filter((i) => i.group === group);
    const done = g.filter((i) => i.state !== "missing").length;
    return { done, total: g.length, percent: g.length ? Math.round((done / g.length) * 100) : 100 };
  };
  const core = tally("core");
  const optional = tally("optional");
  const score = Math.round(core.percent * CORE_WEIGHT + optional.percent * (1 - CORE_WEIGHT));

  const missingCore = items.filter((i) => i.group === "core" && i.state === "missing");
  const suggestions = [
    ...missingCore,
    ...items.filter((i) => i.group === "optional" && i.state === "missing"),
    ...items.filter((i) => i.state === "unknown"),
  ];

  return { score, core, optional, items, missingCore, suggestions };
}
