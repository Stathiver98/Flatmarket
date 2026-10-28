"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center px-6 py-16">
      <h1 className="font-display text-4xl text-ink">Κάτι πήγε στραβά</h1>
      <p className="mt-3 text-ink-soft">
        Παρουσιάστηκε ένα απρόσμενο σφάλμα. Οι αποθηκευμένες αλλαγές σας δεν χάθηκαν. Δοκιμάστε ξανά ή επιστρέψτε στην αρχική.
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">
          Δοκιμάστε ξανά
        </button>
        <Link href="/" className="rounded-full border border-stone-300 px-5 py-2.5 text-sm">
          Αρχική
        </Link>
      </div>
    </div>
  );
}
