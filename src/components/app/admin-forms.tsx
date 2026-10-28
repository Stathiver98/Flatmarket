"use client";

import { useActionState, useState, useTransition } from "react";
import { adminCreateResetLink, adminUpdateListing, adminUpdateRequest, type ResetLinkState } from "@/server/actions/admin";
import type { ActionState } from "@/server/actions/_shared";
import { ActionForm } from "@/components/ui/action-form";
import { FormMessage } from "@/components/ui/feedback";
import { Button, SubmitButton } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/form";
import { CopyField } from "./share-panel";

export function AdminListingForm({ listingId, status, notes }: { listingId: string; status: string; notes: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(adminUpdateListing.bind(null, listingId), null);
  return (
    <ActionForm action={action} pending={pending} className="space-y-2">
      <FormMessage state={state} />
      <Textarea name="adminNotes" defaultValue={notes ?? ""} rows={2} placeholder="Σημείωση προς τον ιδιοκτήτη (εμφανίζεται στην αγγελία του)" className="text-sm" />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="action" value="notes" size="sm" variant="secondary">Αποθήκευση σημείωσης</SubmitButton>
        {status === "DRAFT" && <SubmitButton name="action" value="mark_in_review" size="sm" variant="secondary">Σε έλεγχο</SubmitButton>}
        {status === "AWAITING_REVIEW" && <SubmitButton name="action" value="return_to_draft" size="sm" variant="secondary">Επιστροφή για αλλαγές</SubmitButton>}
        {status === "PUBLISHED" && (
          <SubmitButton name="action" value="takedown" size="sm" variant="danger" onClick={(e) => !window.confirm("Απόσυρση της δημοσιευμένης σελίδας;") && e.preventDefault()}>
            Απόσυρση (εποπτεία)
          </SubmitButton>
        )}
      </div>
    </ActionForm>
  );
}

export function AdminRequestForm({ id, status, notes }: { id: string; status: string; notes: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(adminUpdateRequest.bind(null, id), null);
  return (
    <ActionForm action={action} pending={pending} className="space-y-2">
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Select name="status" defaultValue={status} className="w-auto text-sm">
          <option value="NEW">Νέο</option>
          <option value="IN_PROGRESS">Σε εξέλιξη</option>
          <option value="DONE">Ολοκληρώθηκε</option>
          <option value="ARCHIVED">Αρχειοθετημένο</option>
        </Select>
        <SubmitButton size="sm" variant="secondary">Αποθήκευση</SubmitButton>
      </div>
      <Textarea name="internalNotes" defaultValue={notes ?? ""} rows={2} placeholder="Εσωτερικές σημειώσεις" className="text-sm" />
    </ActionForm>
  );
}

export function ResetLinkButton({ userId }: { userId: string }) {
  const [state, setState] = useState<ResetLinkState>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => window.confirm("Δημιουργία συνδέσμου επαναφοράς κωδικού για αυτόν τον χρήστη;") && start(async () => setState(await adminCreateResetLink(userId)))}
      >
        Σύνδεσμος επαναφοράς κωδικού
      </Button>
      {state?.link && <CopyField value={state.link} label="Σύνδεσμος επαναφοράς" />}
      <FormMessage state={state} />
    </div>
  );
}
