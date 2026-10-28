import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { requireListingAccess } from "@/server/auth/guards";
import { getListingFull } from "@/server/listings/queries";
import { confirmedFactsText, factSheetFor } from "@/server/listings/facts";
import { env, isAiTextConfigured } from "@/server/env";
import { GeneratePanel, SectionEditor } from "@/components/app/content-editor";
import { StepHeader } from "@/components/app/step-footer";
import { LinkButton } from "@/components/ui/button";
import { CONTENT_KEYS } from "@/lib/listing/options";
import { findUnsupportedClaims } from "@/lib/listing/claims";
import { stepHref } from "@/lib/listing/steps";

export const metadata = { title: "Κείμενα αγγελίας" };

export default async function ContentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const { lang: langParam } = await searchParams;
  const lang: "el" | "en" = langParam === "en" ? "en" : "el";
  await requireListingAccess(id, "read");
  const l = await getListingFull(id);
  if (!l) notFound();
  const sheet = factSheetFor(l);
  const factsText = confirmedFactsText(l);
  const sections = CONTENT_KEYS.map((key) => {
    const c = l.content.find((x) => x.key === key && x.lang === lang);
    return {
      key,
      lang,
      text: c?.text ?? "",
      source: c?.source ?? null,
      approved: c?.approved ?? false,
      updatedAt: c?.updatedAt.toISOString() ?? null,
      generatedAt: c?.generatedAt?.toISOString() ?? null,
      aiModel: c?.aiModel ?? null,
      warnings: c ? findUnsupportedClaims(c.text, factsText) : [],
    };
  });
  const approvedCount = (lg: string) => l.content.filter((c) => c.lang === lg && c.approved).length;

  return (
    <>
      <StepHeader n={6} title="Κείμενα αγγελίας">
        Γράψτε τα κείμενα μόνοι σας ή δημιουργήστε προτάσεις από τα στοιχεία σας. Στη σελίδα παρουσίασης και στο PDF εμφανίζονται μόνο τα
        εγκεκριμένα κείμενα.
      </StepHeader>
      <div className="space-y-6">
        <GeneratePanel
          listingId={id}
          configured={isAiTextConfigured()}
          model={env.aiTextModel}
          factSheet={sheet.text}
          unknownCount={sheet.unknown.length}
          approved={l.content.filter((c) => c.approved).map((c) => `${c.key}:${c.lang}`)}
        />
        <nav aria-label="Γλώσσα κειμένων" className="flex gap-2">
          {(["el", "en"] as const).map((lg) => (
            <Link
              key={lg}
              href={`?lang=${lg}`}
              aria-current={lang === lg ? "page" : undefined}
              className={clsx("rounded-full border px-4 py-2 text-sm", lang === lg ? "border-ink bg-ink text-paper" : "border-stone-300 bg-paper text-ink-soft")}
            >
              {lg === "el" ? "Ελληνικά" : "English"} <span className="opacity-60">{approvedCount(lg)}/5 εγκεκριμένα</span>
            </Link>
          ))}
        </nav>
        {sections.map((s) => (
          <SectionEditor key={`${s.key}-${s.lang}-${s.generatedAt ?? "manual"}`} listingId={id} s={s} />
        ))}
      </div>
      <div className="mt-8 flex justify-between">
        <Link href={stepHref(id, "completeness")} className="text-sm text-ink-muted hover:text-ink">← Πληρότητα</Link>
        <LinkButton href={stepHref(id, "review")}>Συνέχεια: Έλεγχος & έγκριση</LinkButton>
      </div>
    </>
  );
}
