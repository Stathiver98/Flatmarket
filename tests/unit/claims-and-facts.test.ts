import { describe, expect, it } from "vitest";
import { findUnsupportedClaims } from "@/lib/listing/claims";
import { buildFactSheet, type FactsInput } from "@/lib/listing/ai-facts";

const base: FactsInput = {
  purpose: "SALE",
  propertyType: "APARTMENT",
  title: null,
  region: "Αττική",
  municipality: "Αθήνα",
  neighborhood: "Παγκράτι",
  address: "Οδός Μυστική 12",
  postalCode: "11635",
  locationPrecision: "AREA",
  price: 200000,
  priceOnRequest: false,
  areaSqm: 90,
  bedrooms: 2,
  bathrooms: 1,
  floor: "3",
  availability: "IMMEDIATE",
  availableFrom: null,
  details: { heating: "AUTONOMOUS_GAS", limitations: "Χρειάζεται ανακαίνιση το μπάνιο" },
  rooms: [],
  hasFloorPlan: false,
  hasStagedPhotos: false,
};

describe("buildFactSheet", () => {
  it("never includes a private address", () => {
    const sheet = buildFactSheet(base);
    expect(sheet.text).not.toContain("Μυστική");
    expect(sheet.text).toContain("Παγκράτι");
  });

  it("includes the address only when the owner chose full visibility", () => {
    const sheet = buildFactSheet({ ...base, locationPrecision: "EXACT" });
    expect(sheet.text).toContain("Οδός Μυστική 12");
  });

  it("lists unknown facts separately and keeps limitations", () => {
    const sheet = buildFactSheet(base);
    expect(sheet.unknown).toContain("Ενεργειακή κατηγορία");
    expect(sheet.unknown.some((u) => u.startsWith("Θέα"))).toBe(true);
    expect(sheet.notes.join(" ")).toContain("Χρειάζεται ανακαίνιση το μπάνιο");
    expect(sheet.known.join(" ")).toContain("Αυτόνομη θέρμανση φυσικού αερίου");
  });
});

describe("findUnsupportedClaims", () => {
  const facts = buildFactSheet(base);
  const confirmed = [...facts.known, ...facts.notes].join("\n");

  it("flags invented views, transport and distances", () => {
    const w = findUnsupportedClaims("Υπέροχη θέα στην Ακρόπολη, 5 λεπτά από το μετρό.", confirmed);
    const ids = w.map((x) => x.id);
    expect(ids).toContain("view");
    expect(ids).toContain("transport");
    expect(ids).toContain("distance");
  });

  it("flags investment and legal claims", () => {
    const ids = findUnsupportedClaims("Ιδανική επένδυση με υψηλή απόδοση, πλήρως τακτοποιημένο.", confirmed).map((x) => x.id);
    expect(ids).toContain("investment");
    expect(ids).toContain("legal");
  });

  it("does not treat the energy performance certificate as an investment claim", () => {
    const w = findUnsupportedClaims("Το πιστοποιητικό ενεργειακής απόδοσης είναι υπό έκδοση.", confirmed);
    expect(w.map((x) => x.id)).not.toContain("investment");
  });

  it("does not flag area units as distances", () => {
    expect(findUnsupportedClaims("Διαμέρισμα 90 m² στον 3ο όροφο.", confirmed)).toHaveLength(0);
  });

  it("accepts claims supported by the confirmed facts", () => {
    const withView = buildFactSheet({ ...base, details: { ...base.details, view: "Θέα στον Λυκαβηττό" } });
    const conf = [...withView.known, ...withView.notes].join("\n");
    expect(findUnsupportedClaims("Θέα στον Λυκαβηττό από το σαλόνι.", conf).map((x) => x.id)).not.toContain("view");
  });

  it("is not fooled by the 'unknown facts' list", () => {
    // The unknown list mentions «Θέα»; it must not count as support.
    expect(findUnsupportedClaims("Με θέα.", confirmed).map((x) => x.id)).toContain("view");
  });

  it("flags renovation claims when the owner said it was not renovated", () => {
    const no = buildFactSheet({ ...base, details: { renovated: "NO" } });
    const conf = [...no.known, ...no.notes].join("\n");
    expect(findUnsupportedClaims("Πλήρως ανακαινισμένο.", conf).map((x) => x.id)).toContain("renovated");
  });
});
