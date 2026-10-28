"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { sendEmail } from "@/server/email";
import { logger } from "@/server/logger";
import { getPublishedByToken } from "@/server/files";
import { checkFormToken, hashIp } from "@/server/security/crypto";
import { getClientIp } from "@/server/security/request";
import { rateLimit } from "@/server/security/rate-limit";
import { presentationTitle } from "@/lib/listing/presentation";

export type EnquiryState = { ok: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | null;

const schema = z.object({
  name: z.string().trim().min(2, "Συμπληρώστε το όνομά σας / Please enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Μη έγκυρο email / Invalid email.").max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, "Το μήνυμα είναι πολύ σύντομο / Message too short.").max(3000),
  consent: z.literal("on", { message: "Απαιτείται συγκατάθεση / Consent is required." }),
});

export async function submitEnquiry(token: string, _prev: EnquiryState, fd: FormData): Promise<EnquiryState> {
  const en = fd.get("lang") === "en";
  const L = (el: string, enText: string) => (en ? enText : el);

  if ((fd.get("website") as string | null)?.length) return { ok: false, error: L("Το μήνυμα δεν καταχωρήθηκε.", "The message was not recorded.") };
  const tc = checkFormToken(fd.get("formToken") as string | null, `enquiry:${token}`);
  if (tc === "too-fast") return { ok: false, error: L("Περιμένετε λίγα δευτερόλεπτα και δοκιμάστε ξανά.", "Please wait a few seconds and try again.") };
  if (tc !== "ok") return { ok: false, error: L("Η φόρμα έληξε. Ανανεώστε τη σελίδα.", "The form has expired. Please reload the page.") };

  const pub = await getPublishedByToken(token);
  if (!pub || !pub.listing.enquiriesEnabled) {
    return { ok: false, error: L("Η αγγελία δεν δέχεται πλέον μηνύματα.", "This listing is no longer accepting messages.") };
  }
  const parsed = schema.safeParse({
    name: fd.get("name"),
    email: fd.get("email"),
    phone: (fd.get("phone") as string) || undefined,
    message: fd.get("message"),
    consent: fd.get("consent") ?? undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: L("Ελέγξτε τα πεδία της φόρμας.", "Please check the form fields."), fieldErrors };
  }
  const d = parsed.data;
  // Simple abuse heuristics: many links in a short message is almost always spam.
  if ((d.message.match(/https?:\/\//g) ?? []).length > 2) {
    return { ok: false, error: L("Το μήνυμα περιέχει πολλούς συνδέσμους.", "The message contains too many links.") };
  }

  const ipHash = hashIp(await getClientIp());
  const allowed =
    (await rateLimit(`enquiry:${ipHash}:${pub.listing.id}`, 3, 3600)) && (await rateLimit(`enquiry-ip:${ipHash}`, 15, 86400));
  if (!allowed) return { ok: false, error: L("Έχετε στείλει πολλά μηνύματα. Δοκιμάστε ξανά αργότερα.", "Too many messages. Please try again later.") };

  let enquiryId: string;
  try {
    const row = await db.enquiry.create({
      data: {
        listingId: pub.listing.id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        message: d.message,
        consentAt: new Date(),
        ipHash,
        deliveryStatus: "NOT_CONFIGURED",
      },
    });
    enquiryId = row.id;
  } catch (e) {
    logger.error("enquiry.store_failed", { error: e });
    return { ok: false, error: L("Το μήνυμα δεν καταχωρήθηκε λόγω τεχνικού προβλήματος. Δοκιμάστε ξανά.", "Your message could not be saved due to a technical problem. Please try again.") };
  }

  let emailed = false;
  const to = pub.listing.contactEmail;
  if (to) {
    const title = presentationTitle(pub.snapshot, "el");
    const result = await sendEmail({
      to,
      replyTo: d.email,
      subject: `Νέο μήνυμα για την αγγελία ${pub.listing.reference}`,
      text: [
        `Νέο μήνυμα για: ${title} (${pub.listing.reference})`,
        "",
        `Από: ${d.name} <${d.email}>${d.phone ? `, τηλ. ${d.phone}` : ""}`,
        "",
        d.message,
        "",
        `Δείτε όλα τα μηνύματα: ${env.appUrl}/app/enquiries`,
      ].join("\n"),
    });
    emailed = result.status === "SENT";
    await db.enquiry.update({ where: { id: enquiryId }, data: { deliveryStatus: result.status, deliveryError: result.error ?? null } });
  }
  logger.info("enquiry.stored", { listingId: pub.listing.id, emailed });
  return {
    ok: true,
    message: emailed
      ? L("Το μήνυμά σας στάλθηκε στον υπεύθυνο της αγγελίας.", "Your message has been sent to the person responsible for this listing.")
      : L(
          "Το μήνυμά σας καταχωρήθηκε και θα το δει ο υπεύθυνος της αγγελίας στον λογαριασμό του.",
          "Your message has been recorded and will be visible to the person responsible for this listing in their account.",
        ),
  };
}
