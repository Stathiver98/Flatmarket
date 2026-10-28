/*
 * Create an account (or promote an existing one to administrator).
 *
 *   npm run user:create -- --email you@example.gr --name "Ονοματεπώνυμο" [--admin] [--agency "Επωνυμία"]
 *
 * The password is read from the NEW_USER_PASSWORD environment variable; if it
 * is not set, a strong random password is generated and printed once.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { db } from "../src/server/db";
import { hashPassword, validatePasswordStrength } from "../src/server/auth/password";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const admin = process.argv.includes("--admin");
  const agency = arg("agency")?.trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Provide a valid --email");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (admin && existing.role !== "ADMIN") {
      await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
      console.log(`Promoted ${email} to administrator.`);
    } else {
      console.log(`User ${email} already exists (role ${existing.role}). Nothing to do.`);
    }
    return;
  }
  if (!name) throw new Error("Provide --name for a new user");
  const generated = !process.env.NEW_USER_PASSWORD;
  const password = process.env.NEW_USER_PASSWORD ?? randomBytes(15).toString("base64url");
  const pwErr = validatePasswordStrength(password);
  if (pwErr) throw new Error(`Weak password: ${pwErr}`);

  const wsName = agency ?? name;
  await db.user.create({
    data: {
      email,
      name,
      role: admin ? "ADMIN" : "USER",
      passwordHash: await hashPassword(password),
      memberships: {
        create: {
          role: "OWNER",
          workspace: { create: { type: agency ? "AGENCY" : "INDIVIDUAL", name: wsName, displayName: wsName, contactName: name, contactEmail: email } },
        },
      },
    },
  });
  console.log(`Created ${admin ? "administrator" : "user"} ${email}.`);
  if (generated) console.log(`Temporary password (shown once, change it after login): ${password}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await db.$disconnect();
    process.exit(1);
  });
