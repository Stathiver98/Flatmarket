"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import Link from "next/link";
import { submitContactRequest, type ContactState } from "@/server/actions/contact";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export function ContactForm({
  formToken,
  defaultKind,
  defaultPackage,
  packages,
}: {
  formToken: string;
  defaultKind: string;
  defaultPackage?: string;
  packages: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContactRequest, null);
  const fe = state?.fieldErrors ?? {};

  if (state?.ok) {
    return (
      <Alert tone="success" title="Το αίτημα καταχωρήθηκε" role="status">
        <p>{state.message}</p>
        <p className="mt-2">
          <Link href="/" className="font-medium underline underline-offset-4">
            Επιστροφή στην αρχική
          </Link>
        </p>
      </Alert>
    );
  }

  return (
    <ActionForm action={action} pending={pending} className="space-y-5" noValidate>
      <input type="hidden" name="formToken" value={formToken} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state?.error && (
        <Alert tone="error" role="alert">
          {state.error}
        </Alert>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Θέμα" htmlFor="kind">
          <Select id="kind" name="kind" defaultValue={defaultKind}>
            <option value="DEMO">Θέλω μια παρουσίαση του Flatmarket</option>
            <option value="PRICING">Αίτημα προσφοράς για πακέτο</option>
            <option value="SERVICE">Υποβοηθούμενη υπηρεσία για ακίνητο</option>
            <option value="CAPTURE">Επιτόπια λήψη / εικονική περιήγηση</option>
            <option value="GENERAL">Γενική ερώτηση</option>
          </Select>
        </Field>
        <Field label="Πακέτο" htmlFor="packageName" optional>
          <Select id="packageName" name="packageName" defaultValue={defaultPackage ?? ""}>
            <option value="">— Δεν έχω αποφασίσει —</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ονοματεπώνυμο" htmlFor="name" error={fe.name}>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={Boolean(fe.name)} />
        </Field>
        <Field label="Email" htmlFor="email" error={fe.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(fe.email)} />
        </Field>
        <Field label="Τηλέφωνο" htmlFor="phone" optional>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label="Εταιρεία / γραφείο" htmlFor="company" optional>
          <Input id="company" name="company" autoComplete="organization" />
        </Field>
      </div>
      <Field label="Μήνυμα" htmlFor="message" error={fe.message} hint="Πείτε μας για το ακίνητο ή το γραφείο σας και τι χρειάζεστε.">
        <Textarea id="message" name="message" rows={5} required aria-invalid={Boolean(fe.message)} />
      </Field>
      <div>
        <Checkbox
          name="consent"
          required
          label={
            <>
              Συμφωνώ να χρησιμοποιηθούν τα στοιχεία μου για να απαντηθεί το αίτημά μου, σύμφωνα με την{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                πολιτική απορρήτου
              </Link>
              .
            </>
          }
        />
        {fe.consent && <p className="mt-1 text-xs font-medium text-danger-600">{fe.consent}</p>}
      </div>
      <SubmitButton size="lg" pendingText="Αποστολή…">
        Αποστολή αιτήματος
      </SubmitButton>
    </ActionForm>
  );
}
