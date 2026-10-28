import type { ReactNode } from "react";
import { Container } from "./sections";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <Container className="py-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border-2 border-amber-700/30 bg-amber-50 p-5 text-sm leading-relaxed text-amber-700" role="note">
          <p className="font-semibold uppercase tracking-wide">Προσχέδιο — δεν έχει ελεγχθεί νομικά</p>
          <p className="mt-1">
            Το κείμενο αυτό είναι προσχέδιο εργασίας. Πρέπει να ελεγχθεί και να συμπληρωθεί από δικηγόρο (και, όπου
            χρειάζεται, από υπεύθυνο προστασίας δεδομένων) πριν από τη δημόσια λειτουργία. Τα πεδία σε αγκύλες [ ]
            πρέπει να συμπληρωθούν με πραγματικά στοιχεία.
          </p>
        </div>
        <h1 className="font-display mt-10 text-4xl text-ink sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-ink-muted">Τελευταία ενημέρωση προσχεδίου: {updated}</p>
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink-soft [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:mt-2 [&_ul]:space-y-1">
          {children}
        </div>
      </div>
    </Container>
  );
}
