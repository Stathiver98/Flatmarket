export const LISTING_STEPS = [
  { id: "basics", n: 1, label: "Βασικά στοιχεία", short: "Βασικά" },
  { id: "details", n: 2, label: "Χαρακτηριστικά", short: "Χαρακτηριστικά" },
  { id: "photos", n: 3, label: "Φωτογραφίες", short: "Φωτογραφίες" },
  { id: "floor-plan", n: 4, label: "Κάτοψη", short: "Κάτοψη" },
  { id: "completeness", n: 5, label: "Πληρότητα", short: "Πληρότητα" },
  { id: "content", n: 6, label: "Κείμενα αγγελίας", short: "Κείμενα" },
  { id: "review", n: 7, label: "Έλεγχος & έγκριση", short: "Έγκριση" },
  { id: "share", n: 8, label: "Δημοσίευση & αρχεία", short: "Δημοσίευση" },
] as const;

export type ListingStepId = (typeof LISTING_STEPS)[number]["id"];

export function stepHref(listingId: string, step: ListingStepId) {
  return `/app/listings/${listingId}/${step}`;
}
