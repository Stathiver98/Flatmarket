/*
 * Local development seed — SAMPLE DATA ONLY.
 *
 * Creates:
 *   - demo@flatmarket.local   (individual account, owns one SAMPLE listing)
 *   - agency@flatmarket.local (agency account, empty)
 *   - admin@flatmarket.local  (administrator)
 * All with the password in SEED_PASSWORD (default: flatmarket-demo-2026).
 *
 * The sample listing and its images are clearly labelled «ΔΕΙΓΜΑ / SAMPLE».
 * Refuses to run when NODE_ENV=production.
 */
import "dotenv/config";
import sharp from "sharp";
import { db } from "../src/server/db";
import { hashPassword } from "../src/server/auth/password";
import { storage, storageKeys } from "../src/server/storage";
import { makeDerivatives } from "../src/server/images/process";
import { createId } from "../src/server/ids";
import { randomToken } from "../src/server/security/crypto";
import { buildPresentation } from "../src/server/listings/presentation";
import { getListingFull } from "../src/server/listings/queries";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed sample data in production.");
  process.exit(1);
}

const PASSWORD = process.env.SEED_PASSWORD || "flatmarket-demo-2026";

const SCENES: { room: "LIVING_ROOM" | "KITCHEN" | "BEDROOM" | "BATHROOM" | "BALCONY" | "EXTERIOR"; label?: string; wall: string; floor: string; accent: string }[] = [
  { room: "LIVING_ROOM", wall: "#efe6d8", floor: "#c9b18f", accent: "#b5532f" },
  { room: "KITCHEN", wall: "#f3efe7", floor: "#bfae96", accent: "#4b5d38" },
  { room: "BEDROOM", label: "Υπνοδωμάτιο 1", wall: "#ece4d6", floor: "#c4a988", accent: "#8c847a" },
  { room: "BEDROOM", label: "Υπνοδωμάτιο 2", wall: "#e9e2d6", floor: "#c2aa8c", accent: "#a99f8f" },
  { room: "BATHROOM", wall: "#eef0ef", floor: "#cfc5b4", accent: "#5d6b74" },
  { room: "BALCONY", wall: "#dfe6e9", floor: "#cfc5b4", accent: "#6f7f57" },
];

/** Neutral placeholder image, clearly marked as a sample (not a real photo). */
async function sampleImage(i: number, s: (typeof SCENES)[number]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
    <rect width="1600" height="1200" fill="${s.wall}"/>
    <rect y="860" width="1600" height="340" fill="${s.floor}"/>
    <rect x="980" y="160" width="440" height="520" fill="#dbe4e6" stroke="#fffdf9" stroke-width="22"/>
    <path d="M1200 160 V680 M980 420 H1420" stroke="#fffdf9" stroke-width="14"/>
    <rect x="180" y="560" width="620" height="260" rx="30" fill="${s.accent}" opacity="0.75"/>
    <rect x="90" y="70" width="780" height="120" rx="20" fill="#1d1b18" opacity="0.82"/>
    <text x="125" y="148" font-family="DejaVu Sans, Arial, sans-serif" font-size="46" font-weight="700" fill="#fffdf9">SAMPLE ${i + 1} - NOT A REAL PHOTO</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

async function upsertUser(email: string, name: string, role: "USER" | "ADMIN", type: "INDIVIDUAL" | "AGENCY", wsName: string) {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return existing;
  return db.user.create({
    data: {
      email,
      name,
      role,
      passwordHash: await hashPassword(PASSWORD),
      memberships: {
        create: {
          role: "OWNER",
          workspace: { create: { type, name: wsName, displayName: wsName, contactName: name, contactEmail: email } },
        },
      },
    },
  });
}

async function main() {
  const demo = await upsertUser("demo@flatmarket.local", "Δοκιμαστικός Χρήστης", "USER", "INDIVIDUAL", "Δοκιμαστικός Χρήστης");
  await upsertUser("agency@flatmarket.local", "Υπεύθυνος Γραφείου", "USER", "AGENCY", "Δοκιμαστικό Γραφείο (ΔΕΙΓΜΑ)");
  await upsertUser("admin@flatmarket.local", "Διαχειριστής", "ADMIN", "INDIVIDUAL", "Διαχείριση Flatmarket");

  const ws = await db.membership.findFirstOrThrow({ where: { userId: demo.id }, select: { workspaceId: true } });
  const already = await db.listing.findFirst({ where: { workspaceId: ws.workspaceId, title: { startsWith: "ΔΕΙΓΜΑ" } } });
  if (already) {
    console.log("Sample listing already exists — skipping.");
  } else {
    const listing = await db.listing.create({
      data: {
        workspaceId: ws.workspaceId,
        createdById: demo.id,
        reference: "FM-DEMO01",
        shareToken: randomToken(24),
        title: "ΔΕΙΓΜΑ — δοκιμαστική αγγελία",
        purpose: "SALE",
        propertyType: "APARTMENT",
        region: "Αττική",
        municipality: "Δήμος Αθηναίων",
        neighborhood: "Παράδειγμα περιοχής",
        address: "Οδός Παραδείγματος 1 (ιδιωτική)",
        locationPrecision: "AREA",
        price: 185000,
        areaSqm: 86,
        bedrooms: 2,
        bathrooms: 1,
        floor: "2",
        availability: "IMMEDIATE",
        details: {
          yearBuilt: 1978,
          renovated: "YES",
          renovationYear: 2021,
          renovationDescription: "Νέα κουζίνα και κουφώματα αλουμινίου (δείγμα).",
          heating: "AUTONOMOUS_GAS",
          energyClass: "PENDING",
          elevator: "YES",
          parking: "NONE",
          storage: "NO",
          outdoor: "YES",
          outdoorSpaces: ["BALCONY"],
          orientation: ["S", "E"],
          commonCharges: "UNKNOWN",
          occupancy: "VACANT",
          extraFeatures: ["SECURITY_DOOR", "DOUBLE_GLAZING"],
          limitations: "Το μπάνιο χρειάζεται ανανέωση (δείγμα περιορισμού).",
        },
        contactName: "Δοκιμαστικός Χρήστης",
        contactEmail: "demo@flatmarket.local",
        content: {
          create: [
            { key: "headline", lang: "el", text: "ΔΕΙΓΜΑ — Διαμέρισμα 86 m² με μπαλκόνι, 2ος όροφος", source: "MANUAL", approved: true, approvedAt: new Date() },
            {
              key: "summary",
              lang: "el",
              text: "Δοκιμαστική αγγελία με δείγματα εικόνων. Διαμέρισμα δύο υπνοδωματίων σε πολυκατοικία με ανελκυστήρα.",
              source: "MANUAL",
              approved: true,
              approvedAt: new Date(),
            },
            {
              key: "description",
              lang: "el",
              text:
                "Αυτή είναι δοκιμαστική αγγελία για να δείτε πώς λειτουργεί το Flatmarket. Οι εικόνες είναι δείγματα και όχι πραγματικές φωτογραφίες.\n\nΤο διαμέρισμα των 86 m² βρίσκεται στον 2ο όροφο πολυκατοικίας του 1978 με ανελκυστήρα. Διαθέτει δύο υπνοδωμάτια, ένα μπάνιο και μπαλκόνι με νότιο και ανατολικό προσανατολισμό. Η κουζίνα και τα κουφώματα ανακαινίστηκαν το 2021.\n\nΤο μπάνιο χρειάζεται ανανέωση. Το πιστοποιητικό ενεργειακής απόδοσης είναι υπό έκδοση.",
              source: "MANUAL",
              approved: true,
              approvedAt: new Date(),
            },
            { key: "headline", lang: "en", text: "SAMPLE — 86 m² apartment with balcony, 2nd floor", source: "MANUAL", approved: true, approvedAt: new Date() },
            {
              key: "description",
              lang: "en",
              text:
                "This is a sample listing to show how Flatmarket works. The images are placeholders, not real photographs.\n\nThe 86 m² apartment is on the 2nd floor of a 1978 building with a lift. It has two bedrooms, one bathroom and a south- and east-facing balcony. The kitchen and windows were renovated in 2021.\n\nThe bathroom needs updating. The energy performance certificate is pending.",
              source: "MANUAL",
              approved: true,
              approvedAt: new Date(),
            },
          ],
        },
      },
    });
    for (const [i, s] of SCENES.entries()) {
      const id = createId();
      const prefix = storageKeys.photo(listing.id, id);
      const original = await sampleImage(i, s);
      const d = await makeDerivatives(original);
      await storage().put(`${prefix}/original.jpg`, original, "image/jpeg");
      await storage().put(`${prefix}/display.jpg`, d.display, "image/jpeg");
      await storage().put(`${prefix}/thumb.jpg`, d.thumb, "image/jpeg");
      await db.photo.create({
        data: {
          id,
          listingId: listing.id,
          originalKey: `${prefix}/original.jpg`,
          displayKey: `${prefix}/display.jpg`,
          thumbKey: `${prefix}/thumb.jpg`,
          originalFilename: `sample-${i + 1}.jpg`,
          mimeType: "image/jpeg",
          sizeBytes: original.length,
          width: d.width,
          height: d.height,
          position: i,
          room: s.room,
          roomLabel: s.label ?? null,
          isCover: i === 0,
        },
      });
    }
    // Publish as link-only so the public presentation page can be explored.
    const full = await getListingFull(listing.id);
    await db.listing.update({
      where: { id: listing.id },
      data: {
        status: "PUBLISHED",
        visibility: "UNLISTED",
        approvedAt: new Date(),
        approvedById: demo.id,
        factsConfirmedAt: new Date(),
        publishedAt: new Date(),
        lastPublishedAt: new Date(),
        publishedSnapshot: buildPresentation(full!),
      },
    });
    await db.listingEvent.createMany({
      data: [
        { listingId: listing.id, actorId: demo.id, type: "created" },
        { listingId: listing.id, actorId: demo.id, type: "approved" },
        { listingId: listing.id, actorId: demo.id, type: "published", data: { visibility: "UNLISTED" } },
      ],
    });
    console.log(`Sample listing published (link-only): /s/${(await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).shareToken}`);
  }

  console.log("\nSample accounts (local development only):");
  console.log(`  demo@flatmarket.local    / ${PASSWORD}`);
  console.log(`  agency@flatmarket.local  / ${PASSWORD}`);
  console.log(`  admin@flatmarket.local   / ${PASSWORD}  (administrator)`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
