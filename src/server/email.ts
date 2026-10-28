import "server-only";
import { env, isEmailConfigured } from "@/server/env";
import { logger } from "@/server/logger";

export type EmailResult = { status: "SENT" | "NOT_CONFIGURED" | "FAILED"; error?: string };

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

/**
 * Sends a plain-text email through Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Returns NOT_CONFIGURED when no provider is set up — callers must surface
 * that honestly instead of claiming the message was delivered.
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  if (!isEmailConfigured()) return { status: "NOT_CONFIGURED" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        reply_to: msg.replyTo,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const error = `Resend HTTP ${res.status}`;
      logger.warn("email.failed", { status: res.status });
      return { status: "FAILED", error };
    }
    logger.info("email.sent");
    return { status: "SENT" };
  } catch (e) {
    logger.warn("email.failed", { error: e });
    return { status: "FAILED", error: e instanceof Error ? e.name : "unknown" };
  }
}
