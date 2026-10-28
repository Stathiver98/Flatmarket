import Link from "next/link";
import { site } from "@/config/site";
import { Wordmark } from "@/components/ui/wordmark";

export function SiteFooter() {
  const b = site.business;
  return (
    <footer className="mt-auto border-t border-stone-200 bg-ink text-stone-200">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <Wordmark inverted className="text-lg" />
          <p className="max-w-sm text-sm leading-relaxed text-stone-300">{site.tagline.el}</p>
          <p className="max-w-sm text-xs leading-relaxed text-stone-400">
            Το Flatmarket παρέχει εργαλεία και υπηρεσίες για τη δημιουργία υλικού προβολής ακινήτων. Δεν ενεργεί ως
            μεσιτικό γραφείο και δεν μεσολαβεί σε αγοραπωλησίες ή μισθώσεις.
          </p>
        </div>
        <nav aria-label="Σελίδες" className="grid grid-cols-1 gap-2 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Flatmarket</p>
          {site.nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-stone-300 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Νομικά" className="grid grid-cols-1 content-start gap-2 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Λογαριασμός & όροι</p>
          <Link href="/login" className="text-stone-300 hover:text-white">Σύνδεση</Link>
          <Link href="/signup" className="text-stone-300 hover:text-white">Δημιουργία λογαριασμού</Link>
          <Link href="/privacy" className="text-stone-300 hover:text-white">Πολιτική απορρήτου</Link>
          <Link href="/terms" className="text-stone-300 hover:text-white">Όροι χρήσης</Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-xs text-stone-400 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {b.legalName || "Flatmarket"}
            {b.vatNumber && ` · ΑΦΜ ${b.vatNumber}`}
            {b.gemiNumber && ` · ΓΕΜΗ ${b.gemiNumber}`}
          </p>
          {b.address && <p>{b.address}</p>}
        </div>
      </div>
    </footer>
  );
}
