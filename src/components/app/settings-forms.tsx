"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePassword, inviteMember, removeLogo, removeMember, revokeInvitation, saveBranding, saveProfile, type InviteState } from "@/server/actions/workspace";
import type { ActionState } from "@/server/actions/_shared";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { Button, SubmitButton } from "@/components/ui/button";
import { Alert, FormMessage } from "@/components/ui/feedback";
import { Uploader } from "./uploader";
import { CopyField } from "./share-panel";

export type BrandingValues = {
  id: string;
  displayName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  registryNumber: string | null;
  hasLogo: boolean;
  logoVersion: string;
  type: "INDIVIDUAL" | "AGENCY";
};

export function BrandingForm({ v, canEdit }: { v: BrandingValues; canEdit: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveBranding.bind(null, v.id), null);
  const [, start] = useTransition();
  const router = useRouter();
  const fe = state?.fieldErrors ?? {};
  return (
    <div className="space-y-6">
      <ActionForm action={action} pending={pending} className="space-y-5">
        <FormMessage state={state} />
        {!canEdit && <Alert tone="info">Μόνο ο διαχειριστής του χώρου εργασίας μπορεί να αλλάξει αυτά τα στοιχεία.</Alert>}
        <fieldset disabled={!canEdit} className="grid gap-5 sm:grid-cols-2">
          <Field label={v.type === "AGENCY" ? "Επωνυμία γραφείου" : "Εμφανιζόμενο όνομα"} htmlFor="displayName" error={fe.displayName}>
            <Input id="displayName" name="displayName" defaultValue={v.displayName} />
          </Field>
          <Field label="Υπεύθυνος επικοινωνίας" htmlFor="contactName" optional error={fe.contactName}>
            <Input id="contactName" name="contactName" defaultValue={v.contactName ?? ""} />
          </Field>
          <Field label="Email επικοινωνίας" htmlFor="contactEmail" optional error={fe.contactEmail}>
            <Input id="contactEmail" name="contactEmail" type="email" defaultValue={v.contactEmail ?? ""} />
          </Field>
          <Field label="Τηλέφωνο" htmlFor="contactPhone" optional error={fe.contactPhone}>
            <Input id="contactPhone" name="contactPhone" type="tel" defaultValue={v.contactPhone ?? ""} />
          </Field>
          <Field label="Ιστότοπος" htmlFor="website" optional error={fe.website}>
            <Input id="website" name="website" type="url" defaultValue={v.website ?? ""} placeholder="https://" />
          </Field>
          <Field label="Αρ. μητρώου μεσίτη / ΓΕΜΗ" htmlFor="registryNumber" optional error={fe.registryNumber} hint="Εμφανίζεται στη σελίδα και στο PDF, αν το συμπληρώσετε.">
            <Input id="registryNumber" name="registryNumber" defaultValue={v.registryNumber ?? ""} />
          </Field>
        </fieldset>
        {canEdit && <SubmitButton>Αποθήκευση</SubmitButton>}
      </ActionForm>
      {canEdit && (
        <div>
          <p className="mb-2 text-sm font-medium">Λογότυπο</p>
          {v.hasLogo && (
            <div className="mb-3 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/logo/${v.id}?v=${v.logoVersion}`} alt="Λογότυπο" className="h-12 w-auto rounded border border-stone-200 bg-white p-1" />
              <Button variant="ghost" size="sm" onClick={() => start(async () => { await removeLogo(v.id); router.refresh(); })}>
                Αφαίρεση
              </Button>
            </div>
          )}
          <Uploader
            endpoint={`/api/workspaces/${v.id}/logo`}
            multiple={false}
            compact
            label="Μεταφόρτωση λογοτύπου"
            hint="PNG (ιδανικά με διαφανές φόντο), JPEG ή WebP. Χρησιμοποιήστε μόνο λογότυπο που σας ανήκει."
          />
        </div>
      )}
    </div>
  );
}

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProfile, null);
  return (
    <ActionForm action={action} pending={pending} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Ονοματεπώνυμο" htmlFor="name">
        <Input id="name" name="name" defaultValue={name} />
      </Field>
      <SubmitButton variant="secondary">Αποθήκευση</SubmitButton>
    </ActionForm>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePassword, null);
  return (
    <ActionForm action={action} pending={pending} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Τρέχων κωδικός" htmlFor="currentPassword">
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
      </Field>
      <Field label="Νέος κωδικός" htmlFor="newPassword" hint="Τουλάχιστον 10 χαρακτήρες.">
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
      </Field>
      <SubmitButton variant="secondary">Αλλαγή κωδικού</SubmitButton>
    </ActionForm>
  );
}

export function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteMember.bind(null, workspaceId), null);
  return (
    <ActionForm action={action} pending={pending} className="space-y-4">
      <FormMessage state={state} />
      {state?.ok && state.link && <CopyField value={state.link} label="Σύνδεσμος πρόσκλησης" />}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="email" type="email" placeholder="email@γραφείο.gr" aria-label="Email συνεργάτη" />
        <SubmitButton>Πρόσκληση</SubmitButton>
      </div>
      <p className="text-xs text-ink-muted">
        Τα μέλη βλέπουν και επεξεργάζονται όλες τις αγγελίες του γραφείου. Ο σύνδεσμος ισχύει 7 ημέρες και μπορεί να χρησιμοποιηθεί μόνο από
        λογαριασμό με το ίδιο email.
      </p>
    </ActionForm>
  );
}

export function MemberActions({ kind, id }: { kind: "member" | "invite"; id: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  return (
    <span className="flex items-center gap-2">
      {err && <span className="text-xs text-danger-600">{err}</span>}
      <button
        type="button"
        disabled={pending}
        className="text-xs text-danger-600 hover:underline"
        onClick={() =>
          window.confirm(kind === "member" ? "Αφαίρεση μέλους από το γραφείο;" : "Ακύρωση πρόσκλησης;") &&
          start(async () => {
            const r = kind === "member" ? await removeMember(id) : await revokeInvitation(id);
            setErr(r && !r.ok ? (r.error ?? "Σφάλμα") : null);
            router.refresh();
          })
        }
      >
        {kind === "member" ? "Αφαίρεση" : "Ακύρωση"}
      </button>
    </span>
  );
}
