import { randomBytes } from "node:crypto";

/** Collision-resistant, URL/storage-safe identifier (used where we need the id before the DB insert). */
export function createId() {
  return "c" + randomBytes(12).toString("hex");
}
