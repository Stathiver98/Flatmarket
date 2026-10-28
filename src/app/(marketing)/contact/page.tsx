import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";
import { Container, PageIntro } from "@/components/marketing/sections";
import { createFormToken } from "@/server/security/crypto";
import { pricing } from "@/config/pricing";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Επικοινωνία & παρουσίαση" };

const KINDS = ["DEMO", "PRICING", "GENERAL", "CAPTURE", "SERVICE"];

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const kind = KINDS.includes(sp.type ?? "") ? sp.type! : "DEMO";
  const b = site.business;
  return (
    <>
      <PageIntro eyebrow="Επικοινωνία" title="Ας μιλήσουμε για τα ακίνητά σας.">
        Ζητήστε μια σύντομη παρουσίαση, προσφορά για πακέτο ή υποβοηθούμενη υπηρεσία. Απαντάμε στο email που θα μας δώσετε.
      </PageIntro>
      <Container className="grid gap-12 py-16 lg:grid-cols-[1.5fr_1fr]">
        <div className="relative rounded-[var(--radius-card)] border border-stone-200 bg-paper p-6 sm:p-8">
          <ContactForm
            formToken={createFormToken("contact")}
            defaultKind={kind}
            defaultPackage={sp.package}
            packages={pricing.packages.map((p) => ({ id: p.id, name: p.name }))}
          />
        </div>
        <aside className="space-y-6 text-sm leading-relaxed text-ink-soft">
          <div>
            <h2 className="font-semibold text-ink">Τι γίνεται μετά</h2>
            <p className="mt-2">
              Το αίτημα αποθηκεύεται με ασφάλεια και το βλέπει η ομάδα του Flatmarket. Δεν θα λάβετε προωθητικά μηνύματα
              χωρίς τη συγκατάθεσή σας.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-ink">Άμεση επικοινωνία</h2>
            {b.publicEmail || b.publicPhone ? (
              <ul className="mt-2 space-y-1">
                {b.publicEmail && <li>{b.publicEmail}</li>}
                {b.publicPhone && <li>{b.publicPhone}</li>}
              </ul>
            ) : (
              <p className="mt-2">Χρησιμοποιήστε τη φόρμα — είναι ο πιο γρήγορος τρόπος να φτάσει το αίτημά σας σε εμάς.</p>
            )}
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs">
            Το Flatmarket παρέχει εργαλεία και υπηρεσίες δημιουργίας υλικού προβολής. Για ερωτήσεις σχετικά με συγκεκριμένο
            ακίνητο που είδατε, χρησιμοποιήστε τη φόρμα επικοινωνίας στη σελίδα του ακινήτου.
          </div>
        </aside>
      </Container>
    </>
  );
}
