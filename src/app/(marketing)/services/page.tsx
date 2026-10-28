import type { Metadata } from "next";
import { Container, FinalCta, PageIntro } from "@/components/marketing/sections";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Υπηρεσίες" };

const SERVICES = [
  {
    title: "Πλατφόρμα αγγελιών (αυτοεξυπηρέτηση)",
    mode: "Διαθέσιμο τώρα",
    tone: "success" as const,
    items: [
      "Καθοδηγούμενη καταχώριση στοιχείων με δείκτη πληρότητας",
      "Οργάνωση φωτογραφιών ανά χώρο, εξώφυλλο, σειρά",
      "Κείμενα σε ελληνικά και αγγλικά — χειροκίνητα ή με αυτόματη δημιουργία, όπου έχει ρυθμιστεί",
      "Σελίδα παρουσίασης, PDF φυλλάδιο, φύλλο στοιχείων, πακέτο ZIP",
    ],
  },
  {
    title: "Διόρθωση φωτογραφιών",
    mode: "Διαθέσιμο τώρα",
    tone: "success" as const,
    items: [
      "Βασική διόρθωση φωτεινότητας, αντίθεσης, ισορροπίας λευκού και ευκρίνειας",
      "Επαγγελματική διόρθωση φωτισμού μέσω εξωτερικού παρόχου, όπου έχει ενεργοποιηθεί",
      "Δεν αφαιρούνται ατέλειες, δεν αλλάζουν δομικά στοιχεία, δεν προστίθεται θέα",
      "Το πρωτότυπο διατηρείται και εσείς επιλέγετε ποια έκδοση θα χρησιμοποιηθεί",
    ],
  },
  {
    title: "Ψηφιακή επίπλωση (virtual staging)",
    mode: "Υποβοηθούμενη υπηρεσία",
    tone: "warning" as const,
    items: [
      "Προτάσεις επίπλωσης για άδειους χώρους, από συνεργάτη σχεδιαστή",
      "Κάθε εικόνα επισημαίνεται «Ψηφιακή επίπλωση / Digitally staged»",
      "Η αρχική φωτογραφία εμφανίζεται πάντα δίπλα στην επιπλωμένη εκδοχή",
      "Απαιτείται ο δικός σας έλεγχος και έγκριση πριν τη δημοσίευση",
    ],
  },
  {
    title: "Οδηγός χώρων και κάτοψη",
    mode: "Διαθέσιμο τώρα",
    tone: "success" as const,
    items: [
      "Φωτογραφίες οργανωμένες ανά δωμάτιο, όπως τα επιβεβαιώσατε",
      "Κάτοψη με σημεία που οδηγούν στις φωτογραφίες κάθε χώρου",
      "Ενσωμάτωση υπάρχουσας εικονικής περιήγησης (Matterport, Kuula, YouTube) ή ασφαλής σύνδεσμος",
    ],
  },
  {
    title: "Επιτόπια λήψη και εικονική περιήγηση",
    mode: "Κατόπιν αιτήματος",
    tone: "neutral" as const,
    items: [
      "Επαγγελματική φωτογράφιση ή σάρωση 3D από συνεργάτες, όπου είναι διαθέσιμοι",
      "Παρέχεται ως υπηρεσία, όχι ως αυτόματο αποτέλεσμα από απλές φωτογραφίες",
      "Διαθεσιμότητα και κόστος επιβεβαιώνονται ανά περιοχή",
    ],
  },
  {
    title: "Ανθρώπινος έλεγχος αγγελίας",
    mode: "Υποβοηθούμενη υπηρεσία",
    tone: "warning" as const,
    items: [
      "Η ομάδα μας ελέγχει κείμενα, σειρά φωτογραφιών και πληρότητα",
      "Σχόλια και προτάσεις μέσα στον χώρο εργασίας σας",
      "Η τελική έγκριση και δημοσίευση παραμένει πάντα δική σας",
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageIntro eyebrow="Υπηρεσίες" title="Εργαλεία που δουλεύουν σήμερα, και υπηρεσίες όπου χρειάζεται άνθρωπος.">
        Κάθε υπηρεσία περιγράφεται όπως ακριβώς λειτουργεί. Όπου εμπλέκεται συνεργάτης ή ανθρώπινη εργασία, το αναφέρουμε
        ρητά.
      </PageIntro>
      <Container className="grid gap-5 py-16 md:grid-cols-2">
        {SERVICES.map((s) => (
          <article key={s.title} className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-7">
            <Badge tone={s.tone}>{s.mode}</Badge>
            <h2 className="font-display mt-4 text-2xl text-ink">{s.title}</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-soft">
              {s.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta-500" aria-hidden="true" />
                  {i}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </Container>
      <Container className="pb-8">
        <div className="flex flex-col items-start justify-between gap-4 rounded-[var(--radius-card)] border border-stone-200 bg-stone-50 p-7 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
            Θέλετε υποβοηθούμενη υπηρεσία ή επιτόπια λήψη; Περιγράψτε μας το ακίνητο και θα σας απαντήσουμε με διαθεσιμότητα
            και κόστος.
          </p>
          <LinkButton href="/contact?type=SERVICE" variant="dark">
            Αίτημα υπηρεσίας
          </LinkButton>
        </div>
      </Container>
      <FinalCta />
    </>
  );
}
