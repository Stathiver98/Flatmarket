import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const FIXTURES = path.join(__dirname, ".tmp");

export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://flatmarket:flatmarket_dev@localhost:5432/flatmarket_test?schema=public";
  if (!/flatmarket_test/.test(url)) throw new Error("Refusing to use a database whose name does not contain 'flatmarket_test'.");
  // Non-destructive: applies pending migrations only. Tests create unique
  // accounts per run, so no data needs to be wiped between runs.
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  // Rate-limit counters persist between runs and all tests share one IP;
  // reset only these counters so repeated runs are not throttled.
  execSync(`psql "${url.split("?")[0]}" -c 'DELETE FROM "RateLimit"'`, { stdio: "inherit" });

  rmSync(FIXTURES, { recursive: true, force: true });
  mkdirSync(FIXTURES, { recursive: true });
  const colours = ["#c9b18f", "#9fb3c8", "#b5532f", "#6f7f57", "#d8cfc0", "#5d6b74"];
  for (const [i, c] of colours.entries()) {
    // Includes EXIF metadata so we can verify it is stripped from public images.
    await sharp({ create: { width: 1200, height: 900, channels: 3, background: c } })
      .jpeg({ quality: 80 })
      .withMetadata({ exif: { IFD0: { Copyright: "E2E-TEST-SECRET-EXIF" } } })
      .toFile(path.join(FIXTURES, `room-${i + 1}.jpg`));
  }
  writeFileSync(path.join(FIXTURES, "not-an-image.jpg"), "this is plain text pretending to be a jpeg");
  await sharp({ create: { width: 1000, height: 700, channels: 3, background: "#ffffff" } }).png().toFile(path.join(FIXTURES, "plan.png"));
}
