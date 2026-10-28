"use client";

import { ActionForm } from "@/components/ui/action-form";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login, requestPasswordReset, resetPassword, signup, type AuthState } from "@/server/actions/auth";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, null);
  return (
    <ActionForm action={action} pending={pending} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <Alert tone="error" role="alert">{state.error}</Alert>}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Κωδικός" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText="Σύνδεση…">
        Σύνδεση
      </SubmitButton>
      <p className="text-center text-sm text-ink-muted">
        <Link href="/forgot-password" className="underline underline-offset-4 hover:text-ink">
          Ξεχάσατε τον κωδικό σας;
        </Link>
      </p>
    </ActionForm>
  );
}

export function SignupForm({ next, inviteEmail }: { next?: string; inviteEmail?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, null);
  const [type, setType] = useState<"INDIVIDUAL" | "AGENCY">("INDIVIDUAL");
  const fe = state?.fieldErrors ?? {};
  return (
    <ActionForm action={action} pending={pending} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <Alert tone="error" role="alert">{state.error}</Alert>}
      {!inviteEmail && (
        <fieldset>
          <legend className="text-sm font-medium text-ink">Χρησιμοποιώ το Flatmarket ως</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["INDIVIDUAL", "Ιδιοκτήτης ή μεσίτης", "Για τα δικά μου ακίνητα"],
                ["AGENCY", "Μεσιτικό γραφείο", "Για ομάδα και πολλά ακίνητα"],
              ] as const
            ).map(([v, t, d]) => (
              <label key={v} className="cursor-pointer">
                <input
                  type="radio"
                  name="accountType"
                  value={v}
                  checked={type === v}
                  onChange={() => setType(v)}
                  className="peer sr-only"
                />
                <span className="block h-full rounded-2xl border border-stone-300 bg-paper p-3 text-sm peer-checked:border-terracotta-600 peer-checked:bg-terracotta-50 peer-focus-visible:ring-2 peer-focus-visible:ring-terracotta-500">
                  <span className="block font-medium text-ink">{t}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{d}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {inviteEmail && <input type="hidden" name="accountType" value="INDIVIDUAL" />}
      {type === "AGENCY" && !inviteEmail && (
        <Field label="Επωνυμία γραφείου" htmlFor="agencyName" error={fe.agencyName}>
          <Input id="agencyName" name="agencyName" autoComplete="organization" aria-invalid={Boolean(fe.agencyName)} />
        </Field>
      )}
      <Field label="Ονοματεπώνυμο" htmlFor="name" error={fe.name}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={Boolean(fe.name)} />
      </Field>
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={inviteEmail}
          readOnly={Boolean(inviteEmail)}
          aria-invalid={Boolean(fe.email)}
        />
      </Field>
      <Field label="Κωδικός" htmlFor="password" error={fe.password} hint="Τουλάχιστον 10 χαρακτήρες.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} aria-invalid={Boolean(fe.password)} />
      </Field>
      <div>
        <Checkbox
          name="terms"
          required
          label={
            <>
              Αποδέχομαι τους{" "}
              <Link href="/terms" target="_blank" className="underline underline-offset-2">
                όρους χρήσης
              </Link>{" "}
              και έχω διαβάσει την{" "}
              <Link href="/privacy" target="_blank" className="underline underline-offset-2">
                πολιτική απορρήτου
              </Link>
              .
            </>
          }
        />
        {fe.terms && <p className="mt-1 text-xs font-medium text-danger-600">{fe.terms}</p>}
      </div>
      <SubmitButton className="w-full" size="lg" pendingText="Δημιουργία…">
        Δημιουργία λογαριασμού
      </SubmitButton>
    </ActionForm>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, null);
  if (state?.ok) return <Alert tone="success" role="status">{state.message}</Alert>;
  return (
    <ActionForm action={action} pending={pending} className="space-y-5">
      {state?.error && <Alert tone="error" role="alert">{state.error}</Alert>}
      <Field label="Email λογαριασμού" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText="Αποστολή…">
        Αποστολή συνδέσμου
      </SubmitButton>
    </ActionForm>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, null);
  if (state?.ok)
    return (
      <Alert tone="success" role="status">
        {state.message}{" "}
        <Link href="/login" className="font-medium underline underline-offset-4">
          Σύνδεση
        </Link>
      </Alert>
    );
  return (
    <ActionForm action={action} pending={pending} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      {state?.error && <Alert tone="error" role="alert">{state.error}</Alert>}
      <Field label="Νέος κωδικός" htmlFor="password" hint="Τουλάχιστον 10 χαρακτήρες.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText="Αποθήκευση…">
        Ορισμός νέου κωδικού
      </SubmitButton>
    </ActionForm>
  );
}
