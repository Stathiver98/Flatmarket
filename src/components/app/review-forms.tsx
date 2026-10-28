"use client";

import { useActionState, useTransition, useState } from "react";
import { approveListing, saveContactSettings, submitForReview } from "@/server/actions/listings";
import type { ActionState } from "@/server/actions/_shared";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, FormMessage } from "@/components/ui/feedback";
import { Button, SubmitButton } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";

export type ContactValues = {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  showContactEmail: boolean;
  showContactPhone: boolean;
  enquiriesEnabled: boolean;
  showBranding: boolean;
  externalTourUrl: string | null;
};

export function ContactSettingsForm({ listingId, v, emailConfigured }: { listingId: string; v: ContactValues; emailConfigured: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveContactSettings.bind(null, listingId), null);
  const fe = state?.fieldErrors ?? {};
  return (
    <ActionForm action={action} pending={pending} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Όνομα επικοινωνίας" htmlFor="contactName" error={fe.contactName} hint="Το πρόσωπο ή το γραφείο που απαντά στους ενδιαφερόμενους.">
          <Input id="contactName" name="contactName" defaultValue={v.contactName ?? ""} />
        </Field>
        <Field label="Email" htmlFor="contactEmail" error={fe.contactEmail}>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={v.contactEmail ?? ""} />
        </Field>
        <Field label="Τηλέφωνο" htmlFor="contactPhone" error={fe.contactPhone}>
          <Input id="contactPhone" name="contactPhone" type="tel" defaultValue={v.contactPhone ?? ""} />
        </Field>
      </div>
      <div className="space-y-3 rounded-2xl bg-stone-50 p-4">
        <Checkbox name="showContactPhone" defaultChecked={v.showContactPhone} label="Εμφάνιση τηλεφώνου στη σελίδα και στο PDF" />
        <Checkbox name="showContactEmail" defaultChecked={v.showContactEmail} label="Εμφάνιση email στη σελίδα και στο PDF" />
        <Checkbox
          name="enquiriesEnabled"
          defaultChecked={v.enquiriesEnabled}
          label="Φόρμα επικοινωνίας στη σελίδα"
          hint={
            emailConfigured
              ? "Τα μηνύματα αποθηκεύονται στον λογαριασμό σας («Μηνύματα») και στέλνονται στο email επικοινωνίας."
              : "Τα μηνύματα αποθηκεύονται στον λογαριασμό σας («Μηνύματα»). Η αποστολή email δεν έχει ρυθμιστεί, οπότε δεν θα λαμβάνετε ειδοποίηση με email."
          }
        />
        <Checkbox name="showBranding" defaultChecked={v.showBranding} label="Εμφάνιση επωνυμίας / λογοτύπου του χώρου εργασίας" />
      </div>
      <Field
        label="Εξωτερική εικονική περιήγηση"
        htmlFor="externalTourUrl"
        optional
        error={fe.externalTourUrl}
        hint="Σύνδεσμος https από Matterport, Kuula ή YouTube ενσωματώνεται στη σελίδα. Άλλοι πάροχοι εμφανίζονται ως ασφαλής εξωτερικός σύνδεσμος. Βεβαιωθείτε ότι έχετε δικαίωμα να τον χρησιμοποιήσετε."
      >
        <Input id="externalTourUrl" name="externalTourUrl" type="url" defaultValue={v.externalTourUrl ?? ""} placeholder="https://my.matterport.com/show/?m=…" />
      </Field>
      <SubmitButton variant="secondary">Αποθήκευση ρυθμίσεων</SubmitButton>
    </ActionForm>
  );
}

export function ApprovalForm({ listingId, blockers, approved, hasStaged }: { listingId: string; blockers: string[]; approved: boolean; hasStaged: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(approveListing.bind(null, listingId), null);
  if (approved && !state) {
    return (
      <Alert tone="success" title="Η αγγελία έχει εγκριθεί">
        Μπορείτε να τη δημοσιεύσετε από το επόμενο βήμα. Οποιαδήποτε αλλαγή στα στοιχεία, στα κείμενα ή στις φωτογραφίες θα χρειαστεί νέα
        έγκριση.
      </Alert>
    );
  }
  return (
    <ActionForm action={action} pending={pending} className="space-y-4">
      <FormMessage state={state} />
      {blockers.length > 0 && (
        <Alert tone="warning" title="Πριν την έγκριση">
          <ul className="list-disc space-y-0.5 pl-5">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Alert>
      )}
      <Checkbox
        name="confirmFacts"
        label="Επιβεβαιώνω ότι έλεγξα τα στοιχεία, τα κείμενα και τις φωτογραφίες, ότι είναι ακριβή σύμφωνα με όσα γνωρίζω και ότι έχω δικαίωμα να προβάλω το ακίνητο και τις φωτογραφίες."
        hint={hasStaged ? "Η αγγελία περιλαμβάνει ψηφιακά επιπλωμένες εικόνες, που θα επισημαίνονται ως τέτοιες." : undefined}
      />
      <SubmitButton disabled={blockers.length > 0} pendingText="Έγκριση…">
        Έγκριση αγγελίας
      </SubmitButton>
      <p className="text-xs text-ink-muted">Η έγκριση δεν δημοσιεύει την αγγελία. Τη δημοσίευση την κάνετε εσείς στο επόμενο βήμα.</p>
    </ActionForm>
  );
}

export function RequestReviewButton({ listingId }: { listingId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>(null);
  return (
    <div className="space-y-2">
      <Button variant="secondary" disabled={pending} onClick={() => start(async () => setMsg(await submitForReview(listingId)))}>
        Αίτημα ελέγχου από την ομάδα Flatmarket
      </Button>
      <FormMessage state={msg} />
    </div>
  );
}
