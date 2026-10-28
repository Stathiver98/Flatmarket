"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { generateListingContent } from "@/server/ai/text";
import { getListingFull } from "@/server/listings/queries";
import { confirmedFactsText, factSheetFor } from "@/server/listings/facts";
import { markEdited, logEvent } from "@/server/listings/mutations";
import { rateLimit } from "@/server/security/rate-limit";
import { logger } from "@/server/logger";
import { CONTENT_KEYS, CONTENT_KEY_LABELS } from "@/lib/listing/options";
import { findUnsupportedClaims, type ClaimWarning } from "@/lib/listing/claims";
import { ActionError, authorizeListing, guarded, refreshListing, type ActionState } from "./_shared";

const keySchema = z.enum(CONTENT_KEYS);
const langSchema = z.enum(["el", "en"]);
const MAX_LEN: Record<(typeof CONTENT_KEYS)[number], number> = {
  headline: 140,
  summary: 600,
  description: 8000,
  features: 2000,
  social: 600,
};

export type SectionState = (ActionState & { warnings?: ClaimWarning[] }) | null;

export async function saveContentSection(
  listingId: string,
  key: string,
  lang: string,
  _prev: SectionState,
  fd: FormData,
): Promise<SectionState> {
  return guarded(async () => {
    await authorizeListing(listingId);
    const k = keySchema.parse(key);
    const lg = langSchema.parse(lang);
    const text = String(fd.get("text") ?? "").replace(/\r\n/g, "\n").trim();
    const approve = fd.get("intent") === "approve";
    if (text.length > MAX_LEN[k]) {
      return { ok: false, error: `Το κείμενο ξεπερνά το όριο των ${MAX_LEN[k]} χαρακτήρων.` };
    }
    const existing = await db.contentSection.findUnique({ where: { listingId_key_lang: { listingId, key: k, lang: lg } } });
    if (!text) {
      if (existing) await db.contentSection.delete({ where: { id: existing.id } });
      await markEdited(listingId);
      refreshListing(listingId);
      return { ok: true, message: "Το πεδίο εκκαθαρίστηκε." };
    }
    const changed = !existing || existing.text !== text;
    const source = !existing ? "MANUAL" : changed && existing.source === "AI" ? "AI_EDITED" : existing.source;
    await db.contentSection.upsert({
      where: { listingId_key_lang: { listingId, key: k, lang: lg } },
      create: { listingId, key: k, lang: lg, text, source: "MANUAL", approved: approve, approvedAt: approve ? new Date() : null },
      update: {
        text,
        source,
        approved: approve ? true : changed ? false : existing.approved,
        approvedAt: approve ? new Date() : changed ? null : existing.approvedAt,
      },
    });
    if (changed || approve) await markEdited(listingId);
    refreshListing(listingId);
    const l = await getListingFull(listingId);
    const warnings = l ? findUnsupportedClaims(text, confirmedFactsText(l)) : [];
    return {
      ok: true,
      warnings,
      message: approve ? `«${CONTENT_KEY_LABELS[k].el}» εγκρίθηκε.` : "Αποθηκεύτηκε ως πρόχειρο (δεν έχει εγκριθεί).",
    };
  });
}

export async function unapproveContentSection(listingId: string, key: string, lang: string): Promise<ActionState> {
  return guarded(async () => {
    await authorizeListing(listingId);
    await db.contentSection.updateMany({
      where: { listingId, key: keySchema.parse(key), lang: langSchema.parse(lang) },
      data: { approved: false, approvedAt: null },
    });
    await markEdited(listingId);
    refreshListing(listingId);
    return { ok: true };
  });
}

export type GenerateState =
  | (ActionState & { generated?: string[]; skipped?: string[]; warnings?: Record<string, ClaimWarning[]> })
  | null;

export async function generateContent(listingId: string, _prev: GenerateState, fd: FormData): Promise<GenerateState> {
  return guarded(async () => {
    const { user } = await authorizeListing(listingId);
    const requested = fd
      .getAll("sections")
      .map((s) => String(s).split(":"))
      .map(([k, lg]) => ({ key: keySchema.safeParse(k), lang: langSchema.safeParse(lg) }))
      .filter((s) => s.key.success && s.lang.success)
      .map((s) => ({ key: s.key.data!, lang: s.lang.data! }));
    if (requested.length === 0) return { ok: false, error: "Επιλέξτε τουλάχιστον μία ενότητα για δημιουργία." };
    const tone = z.enum(["neutral", "warm", "concise"]).catch("neutral").parse(fd.get("tone"));
    const overwriteApproved = fd.get("overwriteApproved") === "on";

    if (!(await rateLimit(`ai-text:${user.id}`, 30, 3600))) {
      return { ok: false, error: "Έχετε φτάσει το όριο δημιουργιών για αυτή την ώρα. Δοκιμάστε ξανά αργότερα." };
    }
    const l = await getListingFull(listingId);
    if (!l) throw new ActionError("Η αγγελία δεν βρέθηκε.");

    const approvedKeys = new Set(l.content.filter((c) => c.approved).map((c) => `${c.key}:${c.lang}`));
    const toGenerate = overwriteApproved ? requested : requested.filter((s) => !approvedKeys.has(`${s.key}:${s.lang}`));
    const skipped = requested.filter((s) => !toGenerate.includes(s)).map((s) => `${s.key}:${s.lang}`);
    if (toGenerate.length === 0) {
      return {
        ok: false,
        skipped,
        error: "Όλες οι επιλεγμένες ενότητες είναι ήδη εγκεκριμένες. Επιλέξτε «Αντικατάσταση εγκεκριμένων» αν θέλετε νέα πρόταση.",
      };
    }

    const sheet = factSheetFor(l);
    const started = Date.now();
    const result = await generateListingContent({ factSheet: sheet.text, sections: toGenerate, tone });
    await db.aiJob.create({
      data: {
        listingId,
        kind: "TEXT_GENERATION",
        provider: "anthropic",
        model: result.ok ? result.model : null,
        status: result.ok ? "SUCCEEDED" : "FAILED",
        errorCode: result.ok ? null : result.code,
        durationMs: Date.now() - started,
        inputTokens: result.ok ? result.usage.inputTokens : null,
        outputTokens: result.ok ? result.usage.outputTokens : null,
      },
    });
    if (!result.ok) {
      logger.warn("ai.text.failed", { listingId, code: result.code });
      return { ok: false, error: result.message };
    }

    const now = new Date();
    const factsText = confirmedFactsText(l);
    const warnings: Record<string, ClaimWarning[]> = {};
    for (const s of result.sections) {
      await db.contentSection.upsert({
        where: { listingId_key_lang: { listingId, key: s.key, lang: s.lang } },
        create: { listingId, key: s.key, lang: s.lang, text: s.text, source: "AI", approved: false, aiModel: result.model, generatedAt: now },
        update: { text: s.text, source: "AI", approved: false, approvedAt: null, aiModel: result.model, generatedAt: now },
      });
      const w = findUnsupportedClaims(s.text, factsText);
      if (w.length) warnings[`${s.key}:${s.lang}`] = w;
    }
    await markEdited(listingId);
    await logEvent(listingId, user.id, "content_generated", { sections: result.sections.map((s) => `${s.key}:${s.lang}`) });
    refreshListing(listingId);
    return {
      ok: true,
      generated: result.sections.map((s) => `${s.key}:${s.lang}`),
      skipped,
      warnings,
      message: `Δημιουργήθηκαν ${result.sections.length} προτάσεις κειμένου. Ελέγξτε τις και εγκρίνετέ τις μία-μία.`,
    };
  });
}
