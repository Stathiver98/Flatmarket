import { describe, expect, it } from "vitest";
import { computeCompleteness, type CompletenessInput } from "@/lib/listing/completeness";

const empty: CompletenessInput = {
  purpose: null,
  propertyType: null,
  region: null,
  municipality: null,
  price: null,
  priceOnRequest: false,
  areaSqm: null,
  bedrooms: null,
  bathrooms: null,
  floor: null,
  availability: null,
  details: {},
  photos: [],
  floorPlanCount: 0,
  content: [],
  contactEmail: null,
  contactPhone: null,
};

const photo = (room: string | null, isCover = false) => ({ room, includeInListing: true, isCover });

const full: CompletenessInput = {
  ...empty,
  purpose: "SALE",
  propertyType: "APARTMENT",
  region: "Αττική",
  municipality: "Αθήνα",
  price: 150000,
  areaSqm: 80,
  bedrooms: 2,
  bathrooms: 1,
  floor: "2",
  availability: "IMMEDIATE",
  photos: [photo("LIVING_ROOM", true), photo("KITCHEN"), photo("BEDROOM"), photo("BATHROOM"), photo("BALCONY")],
  content: [
    { key: "headline", lang: "el", approved: true, text: "Τίτλος" },
    { key: "description", lang: "el", approved: true, text: "Περιγραφή" },
  ],
  contactEmail: "a@b.gr",
};

describe("computeCompleteness", () => {
  it("scores an empty listing at 0 with core items missing", () => {
    const r = computeCompleteness(empty);
    expect(r.score).toBe(0);
    expect(r.missingCore.map((i) => i.id)).toContain("purpose");
    expect(r.missingCore.map((i) => i.id)).toContain("photos");
  });

  it("reaches 100% core when all core facts are provided", () => {
    const r = computeCompleteness(full);
    expect(r.core.percent).toBe(100);
    expect(r.missingCore).toHaveLength(0);
    expect(r.score).toBeGreaterThanOrEqual(75);
  });

  it("increases as information is added", () => {
    const a = computeCompleteness({ ...empty, purpose: "SALE" }).score;
    const b = computeCompleteness({ ...empty, purpose: "SALE", propertyType: "APARTMENT", areaSqm: 70 }).score;
    expect(b).toBeGreaterThan(a);
  });

  it("does not penalise facts explicitly marked as unknown", () => {
    const missing = computeCompleteness(full);
    const unknown = computeCompleteness({ ...full, details: { heating: "UNKNOWN", energyClass: "UNKNOWN", yearBuilt: "UNKNOWN" } });
    expect(unknown.score).toBeGreaterThan(missing.score);
    const heating = unknown.items.find((i) => i.id === "heating")!;
    expect(heating.state).toBe("unknown");
    // Still suggested gently, but listed after missing items.
    expect(unknown.suggestions.at(-1)?.state).toBe("unknown");
  });

  it("skips items that do not apply to the property type", () => {
    const house = computeCompleteness({ ...full, propertyType: "DETACHED_HOUSE", floor: null });
    const ids = house.items.map((i) => i.id);
    expect(ids).not.toContain("floor");
    expect(ids).not.toContain("elevator");
    expect(ids).not.toContain("commonCharges");
    expect(ids).toContain("plot");
    expect(house.core.percent).toBe(100);
  });

  it("suggests a bathroom photo when none is assigned", () => {
    const r = computeCompleteness({ ...full, photos: full.photos.filter((p) => p.room !== "BATHROOM") });
    expect(r.suggestions.some((s) => s.id === "photoBathroom")).toBe(true);
  });

  it("requires at least 5 photos and room assignment", () => {
    const r = computeCompleteness({ ...full, photos: [photo(null, true), photo("KITCHEN")] });
    const ids = r.missingCore.map((i) => i.id);
    expect(ids).toContain("photos");
    expect(ids).toContain("rooms");
  });

  it("only counts APPROVED Greek text", () => {
    const r = computeCompleteness({
      ...full,
      content: [
        { key: "headline", lang: "el", approved: false, text: "Τίτλος" },
        { key: "description", lang: "el", approved: true, text: "Περιγραφή" },
      ],
    });
    expect(r.missingCore.map((i) => i.id)).toContain("descriptionEl");
  });

  it("asks for renovation details only when renovated", () => {
    const yes = computeCompleteness({ ...full, details: { renovated: "YES" } });
    expect(yes.items.find((i) => i.id === "renovation")?.state).toBe("missing");
    const no = computeCompleteness({ ...full, details: { renovated: "NO" } });
    expect(no.items.find((i) => i.id === "renovation")).toBeUndefined();
  });
});
