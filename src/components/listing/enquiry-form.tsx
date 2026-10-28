"use client";

import { useActionState } from "react";
import { submitEnquiry, type EnquiryState } from "@/server/actions/enquiry";
import { ActionForm } from "@/components/ui/action-form";
import { Alert } from "@/components/ui/feedback";
import { SubmitButton } from "@/components/ui/button";
import { Field, Input, Textarea, Checkbox } from "@/components/ui/form";

const T = {
  el: {
    name: "Ονοματεπώνυμο",
    email: "Email",
    phone: "Τηλέφωνο",
    optional: "Προαιρετικό",
    message: "Μήνυμα",
    placeholder: "Θα ήθελα περισσότερες πληροφορίες για το ακίνητο…",
    consent: "Συμφωνώ να διαβιβαστούν τα στοιχεία μου στον υπεύθυνο της αγγελίας για να απαντήσει στο μήνυμά μου.",
    send: "Αποστολή μηνύματος",
    sending: "Αποστολή…",
    privacy: "Προσχέδιο ενημέρωσης απορρήτου: τα στοιχεία σας αποθηκεύονται από το Flatmarket και είναι διαθέσιμα μόνο στον υπεύθυνο της αγγελίας.",
  },
  en: {
    name: "Full name",
    email: "Email",
    phone: "Phone",
    optional: "Optional",
    message: "Message",
    placeholder: "I would like more information about this property…",
    consent: "I agree that my details are passed to the person responsible for this listing so they can reply.",
    send: "Send message",
    sending: "Sending…",
    privacy: "Draft privacy notice: your details are stored by Flatmarket and are only available to the person responsible for this listing.",
  },
};

export function EnquiryForm({ token, formToken, lang, recipient, preview = false }: { token: string; formToken: string; lang: "el" | "en"; recipient: string; preview?: boolean }) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(submitEnquiry.bind(null, token), null);
  const t = T[lang];
  const fe = state?.fieldErrors ?? {};
  if (state?.ok) return <Alert tone="success" role="status">{state.message}</Alert>;
  return (
    <ActionForm action={action} pending={pending} className="space-y-4" noValidate>
      <p className="text-sm text-ink-soft">
        {lang === "el" ? "Το μήνυμα θα το λάβει:" : "Your message will be received by:"} <strong className="text-ink">{recipient}</strong>
      </p>
      <input type="hidden" name="formToken" value={formToken} />
      <input type="hidden" name="lang" value={lang} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {preview && (
        <Alert tone="info">
          {lang === "el" ? "Προεπισκόπηση: η φόρμα θα λειτουργεί μόλις δημοσιευτεί η αγγελία." : "Preview: the form will work once the listing is published."}
        </Alert>
      )}
      {state?.error && <Alert tone="error" role="alert">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.name} htmlFor="enq-name" error={fe.name}>
          <Input id="enq-name" name="name" autoComplete="name" required />
        </Field>
        <Field label={t.email} htmlFor="enq-email" error={fe.email}>
          <Input id="enq-email" name="email" type="email" autoComplete="email" required />
        </Field>
      </div>
      <Field label={<>{t.phone} <span className="text-xs font-normal text-ink-muted">({t.optional})</span></>} htmlFor="enq-phone">
        <Input id="enq-phone" name="phone" type="tel" autoComplete="tel" />
      </Field>
      <Field label={t.message} htmlFor="enq-message" error={fe.message}>
        <Textarea id="enq-message" name="message" rows={4} placeholder={t.placeholder} required />
      </Field>
      <Checkbox name="consent" required label={t.consent} />
      {fe.consent && <p className="text-xs text-danger-600">{fe.consent}</p>}
      <SubmitButton className="w-full" pendingText={t.sending} disabled={preview}>
        {t.send}
      </SubmitButton>
      <p className="text-xs leading-relaxed text-ink-muted">{t.privacy}</p>
    </ActionForm>
  );
}
