"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/server/auth/session";
import { getUserWorkspaces } from "@/server/auth/guards";
import { createListing, logEvent, markEdited } from "@/server/listings/mutations";
import { getListingFull, publicationBlockers } from "@/server/listings/queries";
import { buildPresentation } from "@/server/listings/presentation";
import { storage, storageKeys } from "@/server/storage";
import { randomToken } from "@/server/security/crypto";
import { logger } from "@/server/logger";
import {
  basicsSchema,
  detailsSchema,
  formBool,
  formList,
  formStr,
  parseDecimalLoose,
  parseIntLoose,
} from "@/lib/listing/schema";
import { slugify, defaultTitle } from "@/lib/listing/format";
import { parseTourUrl } from "@/lib/tour-hosts";
import { LISTING_STEPS, stepHref, type ListingStepId } from "@/lib/listing/steps";
import { ActionError, authorizeListing, guarded, refreshListing, type ActionState } from "./_shared";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createListingAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");
  const workspaces = await getUserWorkspaces(user.id);
  const requested = formStr(fd, "workspaceId");
  const ws = workspaces.find((w) => w.id === requested) ?? workspaces[0];
  if (!ws) throw new Error("No workspace");
  const listing = await createListing(ws.id, user.id);
  logger.info("listing.created", { listingId: listing.id });
  redirect(stepHref(listing.id, "basics"));
}

function nextStepRedirect(listingId: string, fd: FormData, current: ListingStepId) {
  const intent = fd.get("intent");
  if (intent === "next") {
    const idx = LISTING_STEPS.findIndex((s) => s.id === current);
    const next = LISTING_STEPS[idx + 1];
    if (next) redirect(stepHref(listingId, next.id));
  }
}

function collectErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.join(".")] ??= i.message;
  return out;
}

// ---------------------------------------------------------------------------
// Step 1: basics
// ---------------------------------------------------------------------------

export async function saveBasics(listingId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guarded(async () => {
    await authorizeListing(listingId);
    const fieldErrors: Record<string, string> = {};
    const num = (name: string, parser: typeof parseIntLoose) => {
      const v = parser(formStr(fd, name));
      if (v === "invalid") {
        fieldErrors[name] = "Μη έγκυρος αριθμός.";
        return null;
      }
      return v;
    };
    const availableFromRaw = formStr(fd, "availableFrom");
    const availableFrom = availableFromRaw ? new Date(availableFromRaw) : null;
    const input = {
      purpose: formStr(fd, "purpose"),
      propertyType: formStr(fd, "propertyType"),
      title: formStr(fd, "title"),
      region: formStr(fd, "region"),
      municipality: formStr(fd, "municipality"),
      neighborhood: formStr(fd, "neighborhood"),
      address: formStr(fd, "address"),
      postalCode: formStr(fd, "postalCode"),
      locationPrecision: formStr(fd, "locationPrecision") ?? "AREA",
      price: num("price", parseIntLoose),
      priceOnRequest: formBool(fd, "priceOnRequest"),
      areaSqm: num("areaSqm", parseDecimalLoose),
      bedrooms: num("bedrooms", parseIntLoose),
      bathrooms: num("bathrooms", parseIntLoose),
      floor: formStr(fd, "floor"),
      availability: formStr(fd, "availability"),
      availableFrom: availableFrom && !isNaN(availableFrom.getTime()) ? availableFrom : null,
    };
    const parsed = basicsSchema.safeParse(input);
    if (!parsed.success || Object.keys(fieldErrors).length) {
      return {
        ok: false,
        error: "Ελέγξτε τα επισημασμένα πεδία. Τίποτα δεν αποθηκεύτηκε.",
        fieldErrors: { ...(parsed.success ? {} : collectErrors(parsed.error)), ...fieldErrors },
      };
    }
    const d = parsed.data;
    await db.listing.update({
      where: { id: listingId },
      data: {
        ...d,
        postalCode: d.postalCode?.replace(/\s/g, "") ?? null,
        availableFrom: d.availability === "FROM_DATE" ? d.availableFrom : null,
        floor: d.propertyType === "DETACHED_HOUSE" ? null : d.floor,
      },
    });
    await markEdited(listingId);
    refreshListing(listingId);
    return { ok: true, message: "Τα βασικά στοιχεία αποθηκεύτηκαν." };
  });
  if (res?.ok) nextStepRedirect(listingId, fd, "basics");
  return res;
}

// ---------------------------------------------------------------------------
// Step 2: characteristics
// ---------------------------------------------------------------------------

export async function saveDetails(listingId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guarded(async () => {
    await authorizeListing(listingId);
    const fieldErrors: Record<string, string> = {};
    const numOrUnknown = (name: string, parser: typeof parseIntLoose) => {
      if (formBool(fd, `${name}Unknown`)) return "UNKNOWN" as const;
      const v = parser(formStr(fd, name));
      if (v === "invalid") {
        fieldErrors[name] = "Μη έγκυρος αριθμός.";
        return undefined;
      }
      return v ?? undefined;
    };
    const num = (name: string, parser: typeof parseIntLoose) => {
      const v = parser(formStr(fd, name));
      if (v === "invalid") {
        fieldErrors[name] = "Μη έγκυρος αριθμός.";
        return undefined;
      }
      return v ?? undefined;
    };
    const str = (name: string) => formStr(fd, name) ?? undefined;
    const raw = {
      yearBuilt: numOrUnknown("yearBuilt", parseIntLoose),
      renovated: str("renovated"),
      renovationYear: num("renovationYear", parseIntLoose),
      renovationDescription: str("renovationDescription"),
      heating: str("heating"),
      airConditioning: str("airConditioning"),
      energyClass: str("energyClass"),
      elevator: str("elevator"),
      parking: str("parking"),
      parkingSpaces: num("parkingSpaces", parseIntLoose),
      storage: str("storage"),
      outdoor: str("outdoor"),
      outdoorSpaces: formList(fd, "outdoorSpaces"),
      outdoorAreaSqm: num("outdoorAreaSqm", parseDecimalLoose),
      furnished: str("furnished"),
      orientation: formList(fd, "orientation"),
      orientationUnknown: formBool(fd, "orientationUnknown") || undefined,
      view: str("view"),
      accessibility: formList(fd, "accessibility"),
      accessibilityNotes: str("accessibilityNotes"),
      commonCharges: numOrUnknown("commonCharges", parseDecimalLoose),
      occupancy: str("occupancy"),
      extraFeatures: formList(fd, "extraFeatures"),
      levels: num("levels", parseIntLoose),
      plotAreaSqm: num("plotAreaSqm", parseDecimalLoose),
      otherFeatures: str("otherFeatures"),
      limitations: str("limitations"),
    };
    const parsed = detailsSchema.safeParse(raw);
    if (!parsed.success || Object.keys(fieldErrors).length) {
      return {
        ok: false,
        error: "Ελέγξτε τα επισημασμένα πεδία. Τίποτα δεν αποθηκεύτηκε.",
        fieldErrors: { ...(parsed.success ? {} : collectErrors(parsed.error)), ...fieldErrors },
      };
    }
    const d = parsed.data;
    // Drop dependent answers that no longer apply.
    if (d.renovated !== "YES") {
      delete d.renovationYear;
      delete d.renovationDescription;
    }
    if (d.outdoor !== "YES") {
      delete d.outdoorSpaces;
      delete d.outdoorAreaSqm;
    }
    if (!d.parking || d.parking === "NONE" || d.parking === "UNKNOWN") delete d.parkingSpaces;
    for (const k of Object.keys(d) as (keyof typeof d)[]) {
      const v = d[k];
      if (v === undefined || (Array.isArray(v) && v.length === 0)) delete d[k];
    }
    await db.listing.update({ where: { id: listingId }, data: { details: d } });
    await markEdited(listingId);
    refreshListing(listingId);
    return { ok: true, message: "Τα χαρακτηριστικά αποθηκεύτηκαν." };
  });
  if (res?.ok) nextStepRedirect(listingId, fd, "details");
  return res;
}

// ---------------------------------------------------------------------------
// Contact, tour, branding (review step)
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  contactName: z.string().trim().max(120).nullable(),
  contactEmail: z.string().trim().toLowerCase().email("Μη έγκυρο email.").max(200).nullable(),
  contactPhone: z
    .string()
    .trim()
    .regex(/^[+0-9 ()-]{6,25}$/, "Μη έγκυρος αριθμός τηλεφώνου.")
    .nullable(),
});

export async function saveContactSettings(listingId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    await authorizeListing(listingId);
    const parsed = contactSchema.safeParse({
      contactName: formStr(fd, "contactName"),
      contactEmail: formStr(fd, "contactEmail"),
      contactPhone: formStr(fd, "contactPhone"),
    });
    if (!parsed.success) return { ok: false, error: "Ελέγξτε τα στοιχεία επικοινωνίας.", fieldErrors: collectErrors(parsed.error) };
    const tourRaw = formStr(fd, "externalTourUrl");
    let externalTourUrl: string | null = null;
    if (tourRaw) {
      const t = parseTourUrl(tourRaw);
      if (!t.ok) return { ok: false, error: t.error, fieldErrors: { externalTourUrl: t.error } };
      externalTourUrl = t.url;
    }
    await db.listing.update({
      where: { id: listingId },
      data: {
        ...parsed.data,
        showContactEmail: formBool(fd, "showContactEmail"),
        showContactPhone: formBool(fd, "showContactPhone"),
        enquiriesEnabled: formBool(fd, "enquiriesEnabled"),
        showBranding: formBool(fd, "showBranding"),
        externalTourUrl,
      },
    });
    await markEdited(listingId);
    refreshListing(listingId);
    return { ok: true, message: "Οι ρυθμίσεις παρουσίασης αποθηκεύτηκαν." };
  });
}

// ---------------------------------------------------------------------------
// Review, approval and publication
// ---------------------------------------------------------------------------

export async function submitForReview(listingId: string): Promise<ActionState> {
  return guarded(async () => {
    const { user } = await authorizeListing(listingId);
    const l = await db.listing.findUniqueOrThrow({ where: { id: listingId }, select: { status: true } });
    if (l.status !== "DRAFT") throw new ActionError("Η αγγελία δεν είναι σε κατάσταση προχείρου.");
    await db.listing.update({ where: { id: listingId }, data: { status: "AWAITING_REVIEW" } });
    await logEvent(listingId, user.id, "submitted_for_review");
    refreshListing(listingId);
    return { ok: true, message: "Η αγγελία στάλθηκε για έλεγχο στην ομάδα Flatmarket." };
  });
}

export async function approveListing(listingId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const { user } = await authorizeListing(listingId);
    if (!formBool(fd, "confirmFacts")) {
      return { ok: false, error: "Επιβεβαιώστε ότι έχετε ελέγξει τα στοιχεία, τα κείμενα και τις φωτογραφίες." };
    }
    const l = await getListingFull(listingId);
    if (!l) throw new ActionError("Η αγγελία δεν βρέθηκε.");
    if (l.status === "ARCHIVED") throw new ActionError("Η αγγελία είναι αρχειοθετημένη.");
    const blockers = publicationBlockers(l);
    if (blockers.length) return { ok: false, error: `Η αγγελία δεν μπορεί ακόμη να εγκριθεί: ${blockers.join(" ")}` };
    await db.listing.update({
      where: { id: listingId },
      data: {
        approvedAt: new Date(),
        approvedById: user.id,
        factsConfirmedAt: new Date(),
        status: l.status === "PUBLISHED" ? "PUBLISHED" : "READY",
      },
    });
    await logEvent(listingId, user.id, "approved");
    refreshListing(listingId);
    return { ok: true, message: "Η αγγελία εγκρίθηκε. Μπορείτε τώρα να τη δημοσιεύσετε." };
  });
}

export async function publishListing(listingId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(async () => {
    const { user } = await authorizeListing(listingId);
    const visibility = fd.get("visibility");
    if (visibility !== "PUBLIC" && visibility !== "UNLISTED") throw new ActionError("Επιλέξτε τρόπο δημοσίευσης.");
    const l = await getListingFull(listingId);
    if (!l) throw new ActionError("Η αγγελία δεν βρέθηκε.");
    if (!l.approvedAt) throw new ActionError("Η αγγελία πρέπει πρώτα να εγκριθεί (βήμα «Έλεγχος & έγκριση»).");
    const blockers = publicationBlockers(l);
    if (blockers.length) throw new ActionError(blockers.join(" "));
    const snapshot = buildPresentation(l);
    let slug = l.slug;
    if (visibility === "PUBLIC" && !slug) {
      const base = slugify(snapshot.content.el.headline ?? defaultTitle(l, "el")) || "akinito";
      slug = `${base}-${l.reference.toLowerCase()}`;
    }
    const now = new Date();
    await db.listing.update({
      where: { id: listingId },
      data: {
        status: "PUBLISHED",
        visibility,
        slug,
        publishedSnapshot: snapshot,
        publishedAt: l.publishedAt ?? now,
        lastPublishedAt: now,
        hasUnpublishedChanges: false,
      },
    });
    await logEvent(listingId, user.id, "published", { visibility });
    logger.info("listing.published", { listingId, visibility });
    refreshListing(listingId);
    return { ok: true, message: visibility === "PUBLIC" ? "Η αγγελία δημοσιεύτηκε." : "Η σελίδα είναι διαθέσιμη μόνο με τον σύνδεσμο." };
  });
}

export async function unpublishListing(listingId: string): Promise<ActionState> {
  return guarded(async () => {
    const { user } = await authorizeListing(listingId);
    const l = await db.listing.findUniqueOrThrow({ where: { id: listingId }, select: { approvedAt: true } });
    await db.listing.update({
      where: { id: listingId },
      data: {
        status: l.approvedAt ? "READY" : "DRAFT",
        visibility: "PRIVATE",
        publishedSnapshot: Prisma.DbNull,
        hasUnpublishedChanges: false,
      },
    });
    await logEvent(listingId, user.id, "unpublished");
    refreshListing(listingId);
    return { ok: true, message: "Η αγγελία αποσύρθηκε. Η σελίδα δεν είναι πλέον διαθέσιμη." };
  });
}

/** Invalidates the old link-only URL (e.g. if it was shared by mistake). */
export async function regenerateShareLink(listingId: string): Promise<ActionState> {
  return guarded(async () => {
    const { user } = await authorizeListing(listingId);
    await db.listing.update({ where: { id: listingId }, data: { shareToken: randomToken(24) } });
    await logEvent(listingId, user.id, "share_link_regenerated");
    refreshListing(listingId);
    return { ok: true, message: "Δημιουργήθηκε νέος σύνδεσμος. Ο προηγούμενος δεν λειτουργεί πλέον." };
  });
}

export async function archiveListing(listingId: string): Promise<ActionState> {
  return guarded(async () => {
    const { user } = await authorizeListing(listingId);
    await db.listing.update({
      where: { id: listingId },
      data: {
        status: "ARCHIVED",
        visibility: "PRIVATE",
        archivedAt: new Date(),
        hasUnpublishedChanges: false,
        publishedSnapshot: Prisma.DbNull,
      },
    });
    await logEvent(listingId, user.id, "archived");
    refreshListing(listingId);
    return { ok: true, message: "Η αγγελία αρχειοθετήθηκε και δεν είναι δημόσια." };
  });
}

export async function restoreListing(listingId: string): Promise<ActionState> {
  return guarded(async () => {
    const { user } = await authorizeListing(listingId);
    await db.listing.update({ where: { id: listingId }, data: { status: "DRAFT", archivedAt: null, approvedAt: null } });
    await logEvent(listingId, user.id, "restored");
    refreshListing(listingId);
    return { ok: true, message: "Η αγγελία επανήλθε ως πρόχειρο." };
  });
}

/** Permanently deletes the listing, its database rows and all stored files. */
export async function deleteListing(listingId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await guarded(async () => {
    await authorizeListing(listingId);
    const l = await db.listing.findUniqueOrThrow({ where: { id: listingId }, select: { reference: true } });
    if (String(fd.get("confirmReference") ?? "").trim().toUpperCase() !== l.reference) {
      return { ok: false, error: `Πληκτρολογήστε τον κωδικό ${l.reference} για επιβεβαίωση.` };
    }
    await storage().deletePrefix(storageKeys.listing(listingId));
    await db.listing.delete({ where: { id: listingId } });
    logger.info("listing.deleted", { listingId });
    return { ok: true };
  });
  if (res?.ok) redirect("/app?deleted=1");
  return res;
}
