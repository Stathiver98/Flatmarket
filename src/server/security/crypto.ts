import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmac(value: string): string {
  return createHmac("sha256", env.appSecret).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** One-way hash of an IP address for rate limiting and abuse review (not reversible). */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return hmac(`ip:${ip}`).slice(0, 32);
}

/**
 * Signed timestamp embedded in public forms. Lets us reject submissions that
 * arrive implausibly fast (bots) or from stale/forged forms.
 */
export function createFormToken(purpose: string): string {
  const ts = Date.now().toString();
  return `${ts}.${hmac(`form:${purpose}:${ts}`)}`;
}

export function checkFormToken(
  token: string | null | undefined,
  purpose: string,
  { minMs = 2500, maxMs = 1000 * 60 * 60 * 6 } = {},
): "ok" | "invalid" | "too-fast" | "expired" {
  if (!token) return "invalid";
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d+$/.test(ts)) return "invalid";
  if (!safeEqual(sig, hmac(`form:${purpose}:${ts}`))) return "invalid";
  const age = Date.now() - Number(ts);
  if (age < minMs) return "too-fast";
  if (age > maxMs) return "expired";
  return "ok";
}
