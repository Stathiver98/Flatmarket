import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { IllustrativeTag, RoomIllustration, FloorPlanIllustration } from "@/components/marketing/illustrations";
import { CheckIcon, Container, Eyebrow, Faq, FinalCta, PackagesGrid, SectionHeading } from "@/components/marketing/sections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <BeforeAfter />
      <Steps />
      <Audiences />
      <Features />
      <ShowcasePreview />
      <section className="py-20 sm:py-28" id="packages">
        <Container>
          <SectionHeading eyebrow="Πακέτα" title="Επιλέξτε το επίπεδο παρουσίασης που χρειάζεστε.">
            Χρέωση ανά ακίνητο ή μηνιαία για γραφεία. Χωρίς κρυφές χρεώσεις — η τελική προσφορά επιβεβαιώνεται γραπτώς.
          </SectionHeading>
          <div className="mt-12">
            <PackagesGrid compact />
          </div>
          <p className="mt-6">
            <Link href="/pricing" className="text-sm font-medium text-terracotta-700 underline-offset-4 hover:underline">
              Δείτε αναλυτικά τι περιλαμβάνει κάθε πακέτο →
            </Link>
          </p>
        </Container>
      </section>
      <section className="border-t border-stone-200/70 py-20 sm:py-28">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="Συχνές ερωτήσεις" title="Ό,τι χρειάζεται να ξέρετε πριν ξεκινήσετε." />
          <Faq items={FAQ} />
        </Container>
      </section>
      <FinalCta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Container className="grid items-center gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-28">
        <div>
          <Eyebrow>Μάρκετινγκ ακινήτων · Ελλάδα</Eyebrow>
          <h1 className="font-display mt-5 text-[2.75rem] leading-[1.04] text-ink sm:text-6xl lg:text-[4.4rem]">
            Το ακίνητό σας, στην καλύτερή του παρουσίαση.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Ανεβάστε φωτογραφίες και στοιχεία ακινήτου και δημιουργήστε μια ολοκληρωμένη, επαγγελματική παρουσίαση.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/signup" size="lg">
              Δημιουργία αγγελίας
            </LinkButton>
            <LinkButton href="/how-it-works" size="lg" variant="secondary">
              Δείτε πώς λειτουργεί
            </LinkButton>
          </div>
          <ul className="mt-9 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
            {[
              "Περιγραφές μόνο από επιβεβαιωμένα στοιχεία",
              "Ελληνικά και αγγλικά",
              "Σελίδα κοινοποίησης και PDF",
              "Τίποτα δεν δημοσιεύεται χωρίς την έγκρισή σας",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckIcon className="text-olive-600" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual />
      </Container>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none" aria-label="Ενδεικτική απεικόνιση της πλατφόρμας">
      <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-terracotta-100/60 blur-3xl" aria-hidden="true" />
      <div className="relative rounded-[1.75rem] border border-stone-200 bg-paper p-3 shadow-[var(--shadow-lift)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem]">
          <RoomIllustration scene="living" />
          <IllustrativeTag className="absolute left-3 top-3" />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-4 px-3 pb-2 pt-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Δείγμα · Πώληση · Διαμέρισμα</p>
            <p className="font-display mt-1 text-2xl text-ink">Διαμέρισμα 86 m², 2ος όροφος</p>
            <p className="mt-1 text-sm text-ink-muted">Παράδειγμα περιοχής</p>
          </div>
          <p className="font-display text-2xl text-terracotta-700">€ ———</p>
        </div>
      </div>
      <div className="absolute -left-8 top-[38%] hidden w-60 rounded-2xl border border-stone-200 bg-paper p-4 shadow-[var(--shadow-lift)] sm:block">
        <p className="text-xs font-medium text-ink-muted">Πληρότητα αγγελίας · δείγμα</p>
        <p className="font-display mt-1 text-3xl text-ink">82%</p>
        <div className="mt-2 h-1.5 rounded-full bg-stone-200">
          <div className="h-full w-[82%] rounded-full bg-olive-600" />
        </div>
        <p className="mt-3 text-xs text-ink-soft">Πρόταση: προσθέστε φωτογραφία μπάνιου.</p>
      </div>
      <div className="absolute -right-3 bottom-24 hidden rounded-2xl border border-stone-200 bg-paper px-4 py-3 shadow-[var(--shadow-lift)] md:block">
        <p className="text-xs text-ink-muted">Κείμενα</p>
        <p className="text-sm font-medium text-ink">Ελληνικά · English</p>
      </div>
    </div>
  );
}

function BeforeAfter() {
  return (
    <section className="border-y border-stone-200/70 bg-paper py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow="Πριν και μετά" title="Από σκόρπιες σημειώσεις σε μια καθαρή, πλήρη αγγελία.">
          Συγκεντρώνετε τα στοιχεία μία φορά. Το Flatmarket τα οργανώνει και σας βοηθά να γράψετε μια ακριβή περιγραφή
          — χωρίς να προσθέτει τίποτα που δεν έχετε επιβεβαιώσει.
        </SectionHeading>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-dashed border-stone-300 bg-cream p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Πριν</p>
              <IllustrativeTag>Ενδεικτικό παράδειγμα</IllustrativeTag>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {(["kitchen", "living", "bedroom"] as const).map((s) => (
                <div key={s} className="aspect-square overflow-hidden rounded-lg">
                  <RoomIllustration scene={s} dim />
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-xl bg-paper p-4 font-mono text-[13px] leading-relaxed text-ink-soft">
              πώληση 2άρι 86τμ 2ος οροφ. ασανσερ ναι
              <br />
              θερμανση? αυτονομη νομιζω.. πεα δεν ξερω
              <br />
              κουζινα ανακαινιση 2021, μπαλκονι
              <br />
              φωτο: 14 χωρις σειρα
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-stone-200 bg-cream p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Μετά</p>
              <IllustrativeTag>Ενδεικτικό παράδειγμα</IllustrativeTag>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {(["living", "kitchen", "bedroom"] as const).map((s, i) => (
                <div key={s} className="relative aspect-square overflow-hidden rounded-lg">
                  <RoomIllustration scene={s} />
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-paper/90 px-2 py-0.5 text-[10px] font-medium text-ink">
                    {["Σαλόνι", "Κουζίνα", "Υπνοδωμάτιο"][i]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-paper p-4">
              <p className="font-display text-lg text-ink">Διαμέρισμα 86 m² με μπαλκόνι, 2ος όροφος</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Διαμέρισμα δύο υπνοδωματίων στον 2ο όροφο πολυκατοικίας με ανελκυστήρα. Η κουζίνα ανακαινίστηκε το 2021.
                Διαθέτει μπαλκόνι.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {["86 m²", "2 υπνοδωμάτια", "Ανελκυστήρας", "Μπαλκόνι"].map((t) => (
                  <span key={t} className="rounded-full bg-stone-100 px-2.5 py-1 text-ink-soft">
                    {t}
                  </span>
                ))}
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Προς επιβεβαίωση: θέρμανση, ΠΕΑ</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Steps() {
  const steps = [
    {
      n: "01",
      title: "Συμπληρώστε τα στοιχεία",
      text: "Ένα σύντομο ερωτηματολόγιο που προσαρμόζεται στο ακίνητο. Ό,τι δεν γνωρίζετε, το δηλώνετε ως άγνωστο.",
    },
    {
      n: "02",
      title: "Οργανώστε τις φωτογραφίες",
      text: "Ανεβάστε, ταξινομήστε και αντιστοιχίστε κάθε φωτογραφία σε χώρο. Προσθέστε κάτοψη, αν υπάρχει.",
    },
    {
      n: "03",
      title: "Ελέγξτε, εγκρίνετε, μοιραστείτε",
      text: "Επεξεργαστείτε τα κείμενα, δείτε την προεπισκόπηση και δημοσιεύστε μόνο όταν είστε έτοιμοι.",
    },
  ];
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow="Πώς λειτουργεί" title="Τρία βήματα. Εσείς έχετε τον τελικό λόγο σε κάθε ένα." />
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-7">
              <p className="font-display text-5xl text-terracotta-500">{s.n}</p>
              <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function Audiences() {
  return (
    <section className="bg-ink py-20 text-paper sm:py-28">
      <Container className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-white/10 bg-white/[0.03] p-8">
          <Eyebrow className="text-terracotta-100">Για μεσιτικά γραφεία</Eyebrow>
          <h3 className="font-display mt-3 text-3xl">Συνέπεια σε κάθε ακίνητο του χαρτοφυλακίου σας.</h3>
          <ul className="mt-6 space-y-3 text-sm text-stone-300">
            {[
              "Όλα τα ακίνητα σε έναν κοινό χώρο εργασίας",
              "Ενιαία εταιρική εμφάνιση σε σελίδες και PDF",
              "Ταχύτερη προετοιμασία υλικού με έτοιμη δομή",
              "Περιγραφές σε ελληνικά και αγγλικά",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <CheckIcon className="text-terracotta-100" />
                {t}
              </li>
            ))}
          </ul>
          <LinkButton href="/agencies" variant="secondary" className="mt-8">
            Λύσεις για γραφεία
          </LinkButton>
        </div>
        <div className="rounded-[var(--radius-card)] border border-white/10 bg-white/[0.03] p-8">
          <Eyebrow className="text-terracotta-100">Για ιδιοκτήτες</Eyebrow>
          <h3 className="font-display mt-3 text-3xl">Μια σοβαρή παρουσίαση, χωρίς να χρειάζεστε εμπειρία.</h3>
          <ul className="mt-6 space-y-3 text-sm text-stone-300">
            {[
              "Καθοδήγηση βήμα-βήμα για τα στοιχεία που μετρούν",
              "Σαφής εικόνα για το τι λείπει από την αγγελία",
              "Ιδιωτική διεύθυνση — εσείς επιλέγετε τι φαίνεται",
              "Σελίδα για να στείλετε σε ενδιαφερόμενους ή μεσίτες",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <CheckIcon className="text-terracotta-100" />
                {t}
              </li>
            ))}
          </ul>
          <LinkButton href="/signup" className="mt-8">
            Δημιουργία αγγελίας
          </LinkButton>
        </div>
      </Container>
    </section>
  );
}

function Features() {
  const features = [
    { t: "Ερωτηματολόγιο που προσαρμόζεται", d: "Ερωτήσεις μόνο για ό,τι αφορά τον τύπο του ακινήτου σας — με επιλογή «Δεν είναι γνωστό»." },
    { t: "Οργάνωση φωτογραφιών", d: "Μεταφορά-απόθεση, ταξινόμηση, αντιστοίχιση σε χώρους, επιλογή εξωφύλλου. Τα πρωτότυπα διατηρούνται πάντα." },
    { t: "Διόρθωση φωτογραφιών", d: "Βασική διόρθωση φωτεινότητας και χρώματος. Δεν αφαιρούνται ατέλειες και δεν αλλάζει η εικόνα του χώρου." },
    { t: "Πληρότητα αγγελίας", d: "Διαφανής δείκτης για το πόσα στοιχεία έχετε συμπληρώσει, με συγκεκριμένες προτάσεις." },
    { t: "Ακριβή κείμενα", d: "Τίτλος, περιγραφές και λεζάντες μόνο από τα στοιχεία που δώσατε. Πάντα επεξεργάσιμα." },
    { t: "Κάτοψη και οδηγός χώρων", d: "Σημειώστε τους χώρους στην κάτοψη και οι επισκέπτες βλέπουν τις φωτογραφίες κάθε δωματίου." },
    { t: "Σελίδα παρουσίασης", d: "Δημόσια ή μόνο με σύνδεσμο. Μπορείτε να την αποσύρετε όποτε θέλετε." },
    { t: "PDF και πακέτο λήψης", d: "Φυλλάδιο, φύλλο στοιχείων, εγκεκριμένες φωτογραφίες και κείμενα σε ένα αρχείο ZIP." },
  ];
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow="Δυνατότητες" title="Όλα όσα χρειάζεται μια ολοκληρωμένη αγγελία." />
        <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.t} className="bg-paper p-6">
              <h3 className="font-semibold text-ink">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.d}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function ShowcasePreview() {
  return (
    <section className="border-y border-stone-200/70 bg-paper py-20 sm:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
        <SectionHeading eyebrow="Σελίδα παρουσίασης" title="Μια σελίδα που ο ενδιαφερόμενος διαβάζει μέχρι το τέλος.">
          <p>
            Μεγάλες φωτογραφίες, βασικά στοιχεία με μια ματιά, περιγραφή σε ελληνικά και αγγλικά, οδηγός ανά χώρο, κάτοψη και
            φόρμα επικοινωνίας προς εσάς. Ό,τι δεν έχει δηλωθεί, εμφανίζεται με ειλικρίνεια ως μη διαθέσιμο.
          </p>
        </SectionHeading>
        <div className="relative rounded-[1.75rem] border border-stone-200 bg-cream p-4 shadow-[var(--shadow-lift)]">
          <IllustrativeTag className="absolute right-6 top-6 z-10" />
          <div className="grid grid-cols-3 grid-rows-2 gap-2">
            <div className="col-span-2 row-span-2 aspect-[4/3] overflow-hidden rounded-xl">
              <RoomIllustration scene="exterior" />
            </div>
            <div className="overflow-hidden rounded-xl">
              <RoomIllustration scene="kitchen" />
            </div>
            <div className="overflow-hidden rounded-xl">
              <RoomIllustration scene="bedroom" />
            </div>
          </div>
          <div className="mt-4 grid gap-4 rounded-xl bg-paper p-5 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="font-display text-xl text-ink">Μονοκατοικία με κήπο</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-ink-soft">
                {["142 m²", "3 υπνοδωμάτια", "2 μπάνια", "Κήπος"].map((t) => (
                  <span key={t} className="rounded-full bg-stone-100 px-2.5 py-1">{t}</span>
                ))}
              </div>
            </div>
            <FloorPlanIllustration className="hidden h-24 w-36 sm:block" />
          </div>
        </div>
      </Container>
    </section>
  );
}

const FAQ = [
  {
    q: "Γράφει το Flatmarket περιγραφές για χαρακτηριστικά που δεν έχω δηλώσει;",
    a: "Όχι. Τα κείμενα βασίζονται αποκλειστικά στα στοιχεία που έχετε επιβεβαιώσει. Δεν προστίθενται θέα, αποστάσεις, παροχές ή νομικοί χαρακτηρισμοί. Επιπλέον, ελέγχουμε αυτόματα το κείμενο για φράσεις που δεν στηρίζονται στα στοιχεία σας και σας τις επισημαίνουμε πριν την έγκριση.",
  },
  {
    q: "Χρειάζεται να χρησιμοποιήσω τεχνητή νοημοσύνη;",
    a: "Όχι. Μπορείτε να γράψετε ή να επικολλήσετε τα δικά σας κείμενα. Η αυτόματη δημιουργία είναι προαιρετική βοήθεια και κάθε κείμενο παραμένει επεξεργάσιμο.",
  },
  {
    q: "Αλλάζουν οι φωτογραφίες μου;",
    a: "Τα πρωτότυπα αρχεία διατηρούνται πάντα. Η βελτίωση αφορά μόνο φωτισμό, χρώμα και ευκρίνεια και εσείς επιλέγετε ποια έκδοση θα χρησιμοποιηθεί. Η ψηφιακή επίπλωση είναι ξεχωριστή υπηρεσία και επισημαίνεται πάντα ως «Ψηφιακή επίπλωση».",
  },
  {
    q: "Δημοσιεύεται κάτι αυτόματα;",
    a: "Ποτέ. Η αγγελία δημοσιεύεται μόνο αφού την ελέγξετε και την εγκρίνετε ρητά. Μπορείτε να την αποσύρετε ή να τη διαγράψετε όποτε θέλετε.",
  },
  {
    q: "Φαίνεται η διεύθυνση του ακινήτου;",
    a: "Η διεύθυνση είναι ιδιωτική από προεπιλογή. Εσείς επιλέγετε αν θα εμφανίζεται μόνο η περιοχή, ο δήμος ή η πλήρης διεύθυνση.",
  },
  {
    q: "Είναι το Flatmarket μεσιτικό γραφείο;",
    a: "Όχι. Το Flatmarket είναι εργαλείο και υπηρεσία δημιουργίας υλικού προβολής. Δεν μεσολαβεί σε συναλλαγές και δεν λαμβάνει προμήθεια.",
  },
  {
    q: "Δημιουργείτε τρισδιάστατη περιήγηση από τις φωτογραφίες;",
    a: "Όχι — μια ακριβής 3D περιήγηση δεν μπορεί να προκύψει από λίγες συνηθισμένες φωτογραφίες. Προσφέρουμε οδηγό ανά χώρο με κάτοψη, ενσωμάτωση υπάρχουσας περιήγησης (π.χ. Matterport) και, κατόπιν αιτήματος, επιτόπια λήψη.",
  },
];
