import type { Metadata } from "next";
import { Container, FinalCta, PageIntro, SectionHeading } from "@/components/marketing/sections";
import { LinkButton } from "@/components/ui/button";
import { RoomIllustration, IllustrativeTag } from "@/components/marketing/illustrations";

export const metadata: Metadata = { title: "Για μεσιτικά γραφεία" };

const POINTS = [
  {
    t: "Πολλά ακίνητα σε έναν χώρο εργασίας",
    d: "Όλες οι αγγελίες του γραφείου σε έναν πίνακα, με αναζήτηση, φίλτρα κατάστασης και άμεση πρόσβαση σε κάθε βήμα.",
  },
  {
    t: "Ενιαία εταιρική εμφάνιση",
    d: "Το λογότυπο, η επωνυμία και τα στοιχεία επικοινωνίας του γραφείου εμφανίζονται με συνέπεια σε σελίδες και PDF.",
  },
  {
    t: "Ταχύτερη προετοιμασία υλικού",
    d: "Η ίδια δομή για κάθε ακίνητο: λιγότερος χρόνος σε αντιγραφές και μορφοποίηση, περισσότερος στους πελάτες σας.",
  },
  {
    t: "Ελληνικά και αγγλικά",
    d: "Κάθε αγγελία μπορεί να έχει ελληνική και αγγλική εκδοχή, με εναλλαγή γλώσσας στη σελίδα παρουσίασης.",
  },
  {
    t: "Σελίδες για κοινοποίηση",
    d: "Δημόσια σελίδα ή σελίδα μόνο με σύνδεσμο, έτοιμη για αποστολή σε ενδιαφερόμενους και πλατφόρμες μηνυμάτων.",
  },
  {
    t: "Πακέτα λήψης",
    d: "Εγκεκριμένες φωτογραφίες, κείμενα, φύλλο στοιχείων και PDF φυλλάδιο σε ένα ZIP, έτοιμα για τα portals που χρησιμοποιείτε.",
  },
  {
    t: "Ομάδα με κοινή πρόσβαση",
    d: "Προσκαλέστε συνεργάτες στον χώρο εργασίας του γραφείου. Κάθε μέλος βλέπει και επεξεργάζεται τα ακίνητα του γραφείου.",
  },
  {
    t: "Υποβοηθούμενες υπηρεσίες",
    d: "Ανθρώπινος έλεγχος κειμένων, επαγγελματική διόρθωση φωτογραφιών και ψηφιακή επίπλωση, όπου τις χρειάζεστε.",
  },
];

export default function AgenciesPage() {
  return (
    <>
      <PageIntro eyebrow="Για μεσιτικά γραφεία" title="Επαγγελματική παρουσίαση σε κάθε ακίνητο, με τη δική σας ταυτότητα.">
        Το Flatmarket βοηθά μικρά και μεσαία γραφεία να ετοιμάζουν σταθερά καλό υλικό προβολής — χωρίς να αλλάζουν τον τρόπο
        που συνεργάζονται με τους πελάτες τους.
      </PageIntro>
      <Container className="py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p) => (
            <div key={p.t} className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-6">
              <h2 className="font-semibold text-ink">{p.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.d}</p>
            </div>
          ))}
        </div>
      </Container>
      <section className="border-y border-stone-200/70 bg-paper py-20">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <SectionHeading eyebrow="Η εμφάνιση του γραφείου σας" title="Το όνομά σας, όχι το δικό μας.">
            <p>
              Στις σελίδες παρουσίασης και στα PDF προβάλλονται η επωνυμία, το λογότυπο και τα στοιχεία επικοινωνίας του
              γραφείου σας. Οι ενδιαφερόμενοι επικοινωνούν απευθείας μαζί σας.
            </p>
            <p className="mt-3 text-sm text-ink-muted">
              Το Flatmarket δεν μεσολαβεί σε συναλλαγές και δεν λαμβάνει προμήθεια.
            </p>
          </SectionHeading>
          <div className="relative rounded-[1.75rem] border border-stone-200 bg-cream p-4 shadow-[var(--shadow-lift)]">
            <IllustrativeTag className="absolute right-6 top-6 z-10" />
            <div className="aspect-[16/9] overflow-hidden rounded-xl">
              <RoomIllustration scene="living" />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-paper p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-ink font-display text-paper">ΑΒ</div>
                <div>
                  <p className="text-sm font-semibold text-ink">Το γραφείο σας</p>
                  <p className="text-xs text-ink-muted">Στοιχεία επικοινωνίας του γραφείου</p>
                </div>
              </div>
              <span className="rounded-full bg-terracotta-600 px-4 py-2 text-xs font-medium text-white">Επικοινωνία</span>
            </div>
          </div>
        </Container>
      </section>
      <Container className="py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[var(--radius-card)] bg-ink p-8 text-paper sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-2xl">Πακέτο Agency</p>
            <p className="mt-1 text-sm text-stone-300">Μηνιαία συνεργασία για γραφεία με πολλά ακίνητα. Η προσφορά προσαρμόζεται στον όγκο σας.</p>
          </div>
          <div className="flex gap-3">
            <LinkButton href="/pricing" variant="secondary">
              Τιμές
            </LinkButton>
            <LinkButton href="/contact?type=DEMO">Ζητήστε παρουσίαση</LinkButton>
          </div>
        </div>
      </Container>
      <FinalCta title="Δοκιμάστε το Flatmarket με ένα ακίνητο του γραφείου σας." />
    </>
  );
}
