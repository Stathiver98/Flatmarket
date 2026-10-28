"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteListing, publishListing, regenerateShareLink, unpublishListing } from "@/server/actions/listings";
import type { ActionState } from "@/server/actions/_shared";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, FormMessage } from "@/components/ui/feedback";
import { Button, SubmitButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <Input readOnly value={value} aria-label={label} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Αντιγράφηκε" : "Αντιγραφή"}
      </Button>
    </div>
  );
}

export function PublishForm({
  listingId,
  approved,
  published,
  currentVisibility,
  hasChanges,
}: {
  listingId: string;
  approved: boolean;
  published: boolean;
  currentVisibility: string;
  hasChanges: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(publishListing.bind(null, listingId), null);
  const [vis, setVis] = useState(currentVisibility === "PUBLIC" ? "PUBLIC" : "UNLISTED");
  if (!approved) {
    return (
      <Alert tone="warning" title={published ? "Οι αλλαγές σας χρειάζονται έγκριση" : "Η αγγελία δεν έχει εγκριθεί"}>
        {published
          ? "Η δημόσια σελίδα δείχνει την προηγούμενη εγκεκριμένη έκδοση. Εγκρίνετε ξανά την αγγελία στο βήμα «Έλεγχος & έγκριση» για να ενημερώσετε τη σελίδα."
          : "Ολοκληρώστε τον έλεγχο και εγκρίνετε την αγγελία στο βήμα «Έλεγχος & έγκριση». Μετά θα μπορείτε να τη δημοσιεύσετε."}
      </Alert>
    );
  }
  return (
    <ActionForm action={action} pending={pending} className="space-y-4">
      <FormMessage state={state} />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Τρόπος δημοσίευσης</legend>
        {[
          {
            v: "UNLISTED",
            t: "Μόνο με σύνδεσμο",
            d: "Η σελίδα δεν εμφανίζεται σε μηχανές αναζήτησης. Όποιος λάβει τον σύνδεσμο μπορεί να τη δει και να τον προωθήσει σε άλλους.",
          },
          { v: "PUBLIC", t: "Δημόσια", d: "Η σελίδα μπορεί να εμφανιστεί σε μηχανές αναζήτησης και να κοινοποιηθεί ελεύθερα." },
        ].map((o) => (
          <label key={o.v} className="cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value={o.v}
              checked={vis === o.v}
              onChange={() => setVis(o.v)}
              className="peer sr-only"
            />
            <span className="block h-full rounded-2xl border border-stone-300 bg-paper p-4 peer-checked:border-terracotta-600 peer-checked:bg-terracotta-50 peer-focus-visible:ring-2 peer-focus-visible:ring-terracotta-500">
              <span className="block font-medium text-ink">{o.t}</span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{o.d}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <SubmitButton size="lg" pendingText="Δημοσίευση…">
        {published ? (hasChanges ? "Ενημέρωση δημοσιευμένης σελίδας" : "Αποθήκευση ρύθμισης δημοσίευσης") : "Δημοσίευση αγγελίας"}
      </SubmitButton>
    </ActionForm>
  );
}

export function PublishedControls({ listingId }: { listingId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>(null);
  const router = useRouter();
  return (
    <div className="space-y-3">
      <FormMessage state={msg} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            window.confirm("Απόσυρση της αγγελίας; Η σελίδα θα πάψει αμέσως να είναι διαθέσιμη.") &&
            start(async () => {
              const r = await unpublishListing(listingId);
              // These controls disappear once the listing is unpublished, so the
              // confirmation is shown by the page itself.
              if (r?.ok) router.replace(`/app/listings/${listingId}/share?notice=unpublished`);
              else setMsg(r);
            })
          }
        >
          Απόσυρση αγγελίας
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            window.confirm("Δημιουργία νέου συνδέσμου; Ο τρέχων σύνδεσμος (και όσοι τον έχουν) θα σταματήσει να λειτουργεί.") &&
            start(async () => setMsg(await regenerateShareLink(listingId)))
          }
        >
          Νέος σύνδεσμος κοινοποίησης
        </Button>
      </div>
    </div>
  );
}

export function DeleteListingForm({ listingId, reference }: { listingId: string; reference: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(deleteListing.bind(null, listingId), null);
  return (
    <ActionForm action={action} pending={pending} className="space-y-3">
      <FormMessage state={state} />
      <p className="text-sm text-ink-soft">
        Διαγράφει οριστικά την αγγελία, όλες τις φωτογραφίες (πρωτότυπα και εκδόσεις), τις κατόψεις, τα κείμενα και τα μηνύματα
        ενδιαφερομένων. Η ενέργεια δεν αναιρείται. Αντίγραφα ασφαλείας της υποδομής διαγράφονται με τον δικό τους κύκλο.
      </p>
      <Field label={`Πληκτρολογήστε ${reference} για επιβεβαίωση`} htmlFor="confirmReference">
        <Input id="confirmReference" name="confirmReference" autoComplete="off" className="max-w-xs" />
      </Field>
      <SubmitButton variant="danger" pendingText="Διαγραφή…">
        Οριστική διαγραφή
      </SubmitButton>
    </ActionForm>
  );
}
