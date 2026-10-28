"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { sendEmail } from "@/server/email";
import { logger } from "@/server/logger";
import { getCurrentUser } from "@/server/auth/session";
import { checkFormToken, hashIp } from "@/server/security/crypto";
import { getClientIp } from "@/server/security/request";
import { rateLimit } from "@/server/security/rate-limit";
import { pricing } from "@/config/pricing";

export type ContactState = {
  ok: boolean;
  error?: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string>;
  emailed?: boolean;
} | null;

const KINDS = ["DEMO", "PRICING", "GENERAL", "CAPTURE", "SERVICE"] as const;

const schema = z.object({
  kind: z.enum(KINDS),
  name: z.string().trim().min(2, "Συμπληρώστε το όνομά σας.").max(120),
  email: z.string().trim().toLowerCase().email("Συμπληρώστε έγκυρο email.").max(200),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  packageName: z.string().trim().max(60).optional(),
  message: z.string().trim().min(10, "Το μήνυμα είναι πολύ σύντομο.").max(4000, "Το μήνυμα είναι πολύ μεγάλο."),
  consent: z.literal("on", { message: "Χρειάζεται η συγκατάθεσή σας για να επεξεργαστούμε το αίτημα." }),
});

const KIND_LABEL: Record<(typeof KINDS)[number], string> = {
  DEMO: "Αίτημα παρουσίασης",
  PRICING: "Αίτημα προσφοράς",
  GENERAL: "Γενική ερώτηση",
  CAPTURE: "Αίτημα επιτόπιας λήψης",
  SERVICE: "Αίτημα υπηρεσίας",
};

export async function submitContactRequest(_prev: ContactState, fd: FormData): Promise<ContactState> {
  // Honeypot: real users never see or fill this field.
  if (typeof fd.get("website") === "string" && (fd.get("website") as string).length > 0) {
    return { ok: false, error: "Το αίτημα δεν μπόρεσε να καταχωρηθεί." };
  }
  const tokenCheck = checkFormToken(fd.get("formToken") as string | null, "contact");
  if (tokenCheck === "too-fast") return { ok: false, error: "Η φόρμα υποβλήθηκε πολύ γρήγορα. Περιμένετε λίγα δευτερόλεπτα και δοκιμάστε ξανά." };
  if (tokenCheck !== "ok") return { ok: false, error: "Η φόρμα έληξε. Ανανεώστε τη σελίδα και δοκιμάστε ξανά." };

  const raw = Object.fromEntries(
    ["kind", "name", "email", "phone", "company", "packageName", "message", "consent"].map((k) => {
      const v = fd.get(k);
      return [k, typeof v === "string" && v.trim() !== "" ? v : undefined];
    }),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Ελέγξτε τα πεδία της φόρμας.", fieldErrors };
  }
  const data = parsed.data;
  const packageName = pricing.packages.find((p) => p.id === data.packageName)?.name;

  const ipHash = hashIp(await getClientIp());
  if (!(await rateLimit(`contact:${ipHash}`, 5, 3600))) {
    return { ok: false, error: "Έχετε στείλει πολλά αιτήματα. Δοκιμάστε ξανά αργότερα." };
  }

  const user = await getCurrentUser();
  let id: string;
  try {
    const row = await db.contactRequest.create({
      data: {
        kind: data.kind,
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        packageName: packageName ?? null,
        message: data.message,
        ipHash,
        userId: user?.id,
        deliveryStatus: "NOT_CONFIGURED",
      },
    });
    id = row.id;
  } catch (e) {
    logger.error("contact.store_failed", { error: e });
    return { ok: false, error: "Το αίτημα δεν αποθηκεύτηκε λόγω τεχνικού προβλήματος. Δοκιμάστε ξανά αργότερα." };
  }

  let emailed = false;
  if (env.contactInboxEmail) {
    const result = await sendEmail({
      to: env.contactInboxEmail,
      replyTo: data.email,
      subject: `[Flatmarket] ${KIND_LABEL[data.kind]}${packageName ? ` — ${packageName}` : ""}`,
      text: [
        `${KIND_LABEL[data.kind]}${packageName ? ` (${packageName})` : ""}`,
        "",
        `Όνομα: ${data.name}`,
        `Email: ${data.email}`,
        data.phone ? `Τηλέφωνο: ${data.phone}` : null,
        data.company ? `Εταιρεία: ${data.company}` : null,
        "",
        data.message,
        "",
        `Δείτε το αίτημα στη διαχείριση: ${env.appUrl}/admin/requests`,
      ]
        .filter((l) => l !== null)
        .join("\n"),
    });
    emailed = result.status === "SENT";
    await db.contactRequest.update({
      where: { id },
      data: { deliveryStatus: result.status, deliveryError: result.error ?? null },
    });
  }
  logger.info("contact.stored", { kind: data.kind, emailed });

  return {
    ok: true,
    emailed,
    message: emailed
      ? "Ευχαριστούμε. Το αίτημά σας καταχωρήθηκε και προωθήθηκε στην ομάδα μας."
      : "Ευχαριστούμε. Το αίτημά σας καταχωρήθηκε στο σύστημά μας και θα το δει η ομάδα μας.",
  };
}
