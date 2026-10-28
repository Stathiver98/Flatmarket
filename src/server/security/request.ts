import "server-only";
import { headers } from "next/headers";
import { env } from "@/server/env";

/** Best-effort client IP. X-Forwarded-For is only trusted when TRUST_PROXY=true. */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const xff = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (env.trustProxy) {
    // The left-most entry is the original client as reported by our own proxy.
    if (xff.length) return xff[0];
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  }
  // Without a trusted proxy, only the right-most entry (appended by the hop
  // closest to us) cannot be forged by the client.
  return xff.length ? xff[xff.length - 1] : "unknown";
}

/**
 * CSRF protection for route handlers that mutate state (Server Actions are
 * already origin-checked by Next.js). Requires the Origin header to match Host.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
