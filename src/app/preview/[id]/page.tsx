import Link from "next/link";
import { notFound } from "next/navigation";
import { requireListingAccess } from "@/server/auth/guards";
import { getListingFull, publicationBlockers } from "@/server/listings/queries";
import { buildPresentation } from "@/server/listings/presentation";
import { privateUrls } from "@/server/listings/public-urls";
import { PresentationView } from "@/components/listing/presentation-view";

export const metadata = { title: "Προεπισκόπηση", robots: { index: false } };

export default async function PreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const { lang: lp } = await searchParams;
  const lang = lp === "en" ? "en" : "el";
  await requireListingAccess(id, "read");
  const l = await getListingFull(id);
  if (!l) notFound();
  const p = buildPresentation(l);
  const blockers = publicationBlockers(l);
  const unapproved = l.content.filter((c) => !c.approved && c.text.trim()).length;

  const banner = (
    <div className="sticky top-0 z-50 bg-ink text-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-semibold">Προεπισκόπηση — η σελίδα δεν είναι δημόσια</p>
          <p className="text-xs text-stone-300">
            Εμφανίζονται μόνο τα εγκεκριμένα κείμενα και οι φωτογραφίες που περιλαμβάνονται στην αγγελία.
            {unapproved > 0 && ` ${unapproved} κείμενα δεν έχουν εγκριθεί και δεν εμφανίζονται.`}
            {blockers.length > 0 && ` ${blockers.length} εκκρεμότητες πριν τη δημοσίευση.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/listings/${id}/review`} className="rounded-full bg-paper px-4 py-1.5 text-xs font-medium text-ink">
            Έλεγχος & έγκριση
          </Link>
          <Link href={`/app/listings/${id}`} className="rounded-full border border-white/30 px-4 py-1.5 text-xs">
            Επιστροφή
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <PresentationView
      p={p}
      lang={lang}
      urls={privateUrls(id)}
      langHref={(lg) => `/preview/${id}?lang=${lg}`}
      enquiry={{ token: "preview", formToken: "", preview: true }}
      banner={banner}
    />
  );
}
