import { describe, expect, it } from "vitest";
import { parseDecimalLoose, parseIntLoose, readDetails, basicsSchema } from "@/lib/listing/schema";
import { formatPrice, publicLocation, slugify } from "@/lib/listing/format";
import { parseTourUrl } from "@/lib/tour-hosts";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/server/auth/password";

describe("number parsing (Greek formats)", () => {
  it("parses prices with dot thousand separators", () => {
    expect(parseIntLoose("185.000")).toBe(185000);
    expect(parseIntLoose("185 000 €")).toBe(185000);
    expect(parseIntLoose("abc")).toBe("invalid");
    expect(parseIntLoose(null)).toBeNull();
  });
  it("parses decimals with comma", () => {
    expect(parseDecimalLoose("85,5")).toBe(85.5);
    expect(parseDecimalLoose("1.250,75")).toBe(1250.75);
    expect(parseDecimalLoose("86")).toBe(86);
    expect(parseDecimalLoose("86 m²")).toBe(86);
  });
});

describe("schemas", () => {
  it("drops invalid stored detail values instead of crashing", () => {
    expect(readDetails({ heating: "NOT_A_VALUE", elevator: "YES", bogus: 1 })).toEqual({ elevator: "YES" });
    expect(readDetails(null)).toEqual({});
  });
  it("rejects invalid postal codes and absurd prices", () => {
    const base = {
      purpose: null, propertyType: null, title: null, region: null, municipality: null, neighborhood: null, address: null,
      postalCode: null, locationPrecision: "AREA", price: null, priceOnRequest: false, areaSqm: null, bedrooms: null,
      bathrooms: null, floor: null, availability: null, availableFrom: null,
    };
    expect(basicsSchema.safeParse(base).success).toBe(true);
    expect(basicsSchema.safeParse({ ...base, postalCode: "1234" }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...base, price: -5 }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...base, purpose: "LEASE" }).success).toBe(false);
  });
});

describe("formatting", () => {
  it("formats prices in Greek and English", () => {
    expect(formatPrice(185000, false, "SALE", "el")).toMatch(/185\.000/);
    expect(formatPrice(900, false, "RENT", "el")).toMatch(/μήνα/);
    expect(formatPrice(null, true, "SALE", "en")).toBe("Price on request");
  });
  it("respects location privacy", () => {
    const l = { region: "Αττική", municipality: "Αθήνα", neighborhood: "Κουκάκι", address: "Οδός 1", postalCode: null };
    expect(publicLocation({ ...l, locationPrecision: "REGION" })).toBe("Αττική");
    expect(publicLocation({ ...l, locationPrecision: "AREA" })).toBe("Κουκάκι, Αθήνα, Αττική");
    expect(publicLocation({ ...l, locationPrecision: "AREA" })).not.toContain("Οδός");
    expect(publicLocation({ ...l, locationPrecision: "EXACT" })).toContain("Οδός 1");
  });
  it("transliterates Greek slugs", () => {
    expect(slugify("Διαμέρισμα στο Παγκράτι")).toBe("diamerisma-sto-pagkrati");
  });
});

describe("virtual tour links", () => {
  it("embeds known providers", () => {
    const r = parseTourUrl("https://my.matterport.com/show/?m=AbC123");
    expect(r.ok && r.embedUrl).toBe("https://my.matterport.com/show/?m=AbC123");
    const y = parseTourUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(y.ok && y.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });
  it("links (but does not embed) unknown https providers", () => {
    const r = parseTourUrl("https://example-tours.gr/t/1");
    expect(r.ok && r.embedUrl).toBeNull();
  });
  it("rejects unsafe URLs", () => {
    expect(parseTourUrl("http://my.matterport.com/show/?m=1").ok).toBe(false);
    expect(parseTourUrl("javascript:alert(1)").ok).toBe(false);
    expect(parseTourUrl("https://user:pw@kuula.co/share/x").ok).toBe(false);
  });
});

describe("passwords", () => {
  it("hashes and verifies", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
  it("enforces a minimum length", () => {
    expect(validatePasswordStrength("short")).not.toBeNull();
    expect(validatePasswordStrength("long enough pass")).toBeNull();
  });
});
