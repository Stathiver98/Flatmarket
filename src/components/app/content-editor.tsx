"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { saveContentSection, unapproveContentSection, generateContent, type GenerateState, type SectionState } from "@/server/actions/content";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge } from "@/components/ui/feedback";
import { Button, SubmitButton } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/form";
import { CONTENT_KEYS, CONTENT_KEY_LABELS, type ContentKey } from "@/lib/listing/options";
import type { ClaimWarning } from "@/lib/listing/claims";

export type SectionData = {
  key: ContentKey;
  lang: "el" | "en";
  text: string;
  source: "MANUAL" | "AI" | "AI_EDITED" | null;
  approved: boolean;
  updatedAt: string | null;
  generatedAt: string | null;
  aiModel: string | null;
  warnings: ClaimWarning[];
};

const SOURCE_LABEL = { MANUAL: "Γραμμένο από εσάς", AI: "Πρόταση AI — μη επεξεργασμένη", AI_EDITED: "Πρόταση AI με δικές σας αλλαγές" };
const LIMITS: Record<ContentKey, number> = { headline: 140, summary: 600, description: 8000, features: 2000, social: 600 };

export function SectionEditor({ listingId, s }: { listingId: string; s: SectionData }) {
  const [state, action, pending] = useActionState<SectionState, FormData>(saveContentSection.bind(null, listingId, s.key, s.lang), null);
  const [text, setText] = useState(s.text);
  const [copied, setCopied] = useState(false);
  const [unapproving, setUnapproving] = useState(false);
  const router = useRouter();
  const warnings = state?.ok ? (state.warnings ?? []) : s.warnings;
  const meta = CONTENT_KEY_LABELS[s.key];
  const rows = s.key === "description" ? 12 : s.key === "features" ? 7 : s.key === "headline" ? 2 : 4;
  return (
    <ActionForm action={action} pending={pending} className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={`t-${s.key}-${s.lang}`} className="font-semibold text-ink">
          {meta.el} <span className="font-normal text-ink-muted">· {s.lang === "el" ? "Ελληνικά" : "English"}</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {s.source && <Badge tone={s.source === "MANUAL" ? "neutral" : "accent"}>{SOURCE_LABEL[s.source]}</Badge>}
          {s.approved ? <Badge tone="success">Εγκεκριμένο</Badge> : s.text ? <Badge tone="warning">Πρόχειρο</Badge> : null}
        </div>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{meta.hint}</p>
      <textarea
        id={`t-${s.key}-${s.lang}`}
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={rows}
        maxLength={LIMITS[s.key]}
        lang={s.lang}
        className="mt-3 block w-full rounded-xl border border-stone-300 bg-paper px-3.5 py-2.5 text-[15px] leading-relaxed focus:border-terracotta-500 focus:outline-none focus:ring-2 focus:ring-terracotta-100"
        placeholder={s.lang === "el" ? "Γράψτε ή επικολλήστε το κείμενό σας…" : "Write or paste your text…"}
      />
      <div className="mt-1 flex justify-between text-xs text-ink-muted">
        <span>{text !== s.text && "Μη αποθηκευμένες αλλαγές"}</span>
        <span>
          {text.length}/{LIMITS[s.key]}
        </span>
      </div>
      {warnings.length > 0 && (
        <Alert tone="warning" className="mt-3" title="Ελέγξτε αυτές τις φράσεις πριν την έγκριση">
          <p>Το κείμενο αναφέρει στοιχεία που δεν βρίσκονται σε όσα έχετε επιβεβαιώσει:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {warnings.map((w) => (
              <li key={w.id}>
                <span className="font-medium">{w.label}</span>: «{w.excerpt}»
              </li>
            ))}
          </ul>
        </Alert>
      )}
      {state?.error && <Alert tone="error" className="mt-3">{state.error}</Alert>}
      {state?.ok && state.message && <p className="mt-3 text-sm text-olive-700" role="status">{state.message}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <SubmitButton name="intent" value="save" variant="secondary" size="sm">
          Αποθήκευση πρόχειρου
        </SubmitButton>
        <SubmitButton name="intent" value="approve" size="sm" disabled={!text.trim()}>
          {s.approved && text === s.text ? "Εγκεκριμένο ✓" : "Αποθήκευση & έγκριση"}
        </SubmitButton>
        {s.approved && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={unapproving}
            onClick={async () => {
              setUnapproving(true);
              await unapproveContentSection(listingId, s.key, s.lang);
              setUnapproving(false);
              router.refresh();
            }}
          >
            Αναίρεση έγκρισης
          </Button>
        )}
        {text && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Αντιγράφηκε" : "Αντιγραφή"}
          </Button>
        )}
      </div>
    </ActionForm>
  );
}

export function GeneratePanel({
  listingId,
  configured,
  model,
  factSheet,
  approved,
  unknownCount,
}: {
  listingId: string;
  configured: boolean;
  model: string;
  factSheet: string;
  approved: string[];
  unknownCount: number;
}) {
  const [state, action, pending] = useActionState<GenerateState, FormData>(generateContent.bind(null, listingId), null);
  if (!configured) {
    return (
      <Alert tone="info" title="Η αυτόματη δημιουργία κειμένων δεν έχει ρυθμιστεί">
        Γράψτε ή επικολλήστε τα κείμενα στα παρακάτω πεδία — όλες οι λειτουργίες της αγγελίας δουλεύουν κανονικά. Για να ενεργοποιηθεί η
        δημιουργία με AI, ο διαχειριστής πρέπει να ορίσει το <code>ANTHROPIC_API_KEY</code> στον διακομιστή.
      </Alert>
    );
  }
  return (
    <ActionForm action={action} pending={pending} className="rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-5">
      <h3 className="font-semibold text-ink">Δημιουργία προτάσεων κειμένου</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Οι προτάσεις βασίζονται μόνο στα στοιχεία που έχετε επιβεβαιώσει. Δεν δημοσιεύονται: τις ελέγχετε, τις επεξεργάζεστε και τις
        εγκρίνετε μία-μία. Εγκεκριμένα κείμενα δεν αντικαθίστανται, εκτός αν το επιλέξετε ρητά.
      </p>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium">Ενότητες</legend>
        <div className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {(["el", "en"] as const).map((lang) => (
            <div key={lang} className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{lang === "el" ? "Ελληνικά" : "English"}</p>
              {CONTENT_KEYS.map((k) => {
                const id = `${k}:${lang}`;
                const isApproved = approved.includes(id);
                return (
                  <Checkbox
                    key={id}
                    name="sections"
                    value={id}
                    defaultChecked={!isApproved && (lang === "el" || k === "headline" || k === "description")}
                    label={
                      <>
                        {CONTENT_KEY_LABELS[k].el}
                        {isApproved && <span className="ml-1.5 text-xs text-olive-700">(εγκεκριμένο)</span>}
                      </>
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium">Ύφος</span>
          <Select name="tone" defaultValue="neutral" className="mt-1">
            <option value="neutral">Επαγγελματικό, ουδέτερο</option>
            <option value="warm">Ζεστό, φιλικό</option>
            <option value="concise">Λιτό, πρακτικό</option>
          </Select>
        </label>
        <div className="flex items-end">
          <Checkbox name="overwriteApproved" label="Αντικατάσταση και των εγκεκριμένων ενοτήτων" hint="Θα χρειαστεί νέα έγκριση." />
        </div>
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-ink-soft">Δείτε ακριβώς ποια στοιχεία θα σταλούν ({unknownCount} άγνωστα θα παραλειφθούν)</summary>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-paper p-3 text-xs leading-relaxed text-ink-soft">{factSheet}</pre>
        <p className="mt-1 text-xs text-ink-muted">Η διεύθυνση δεν αποστέλλεται, εκτός αν έχετε επιλέξει να εμφανίζεται δημόσια. Μοντέλο: {model}.</p>
      </details>
      {state?.error && <Alert tone="error" className="mt-4">{state.error}</Alert>}
      {state?.ok && (
        <Alert tone="success" className="mt-4">
          {state.message}
          {state.skipped && state.skipped.length > 0 && <> Παραλείφθηκαν {state.skipped.length} εγκεκριμένες ενότητες.</>}
          {state.warnings && Object.keys(state.warnings).length > 0 && (
            <> Ορισμένα κείμενα περιέχουν φράσεις προς έλεγχο — δείτε τις επισημάνσεις παρακάτω.</>
          )}
        </Alert>
      )}
      <SubmitButton className="mt-4" pendingText="Δημιουργία… (μπορεί να διαρκέσει έως ένα λεπτό)">
        Δημιουργία προτάσεων
      </SubmitButton>
    </ActionForm>
  );
}
