import Link from "next/link";
import type { Presentation } from "@/lib/listing/presentation";
import {
  coverPhoto,
  hasEnglish,
  keyFacts,
  missingInformation,
  photosByRoom,
  presentationTitle,
  priceText,
  roomAnchor,
  roomLabel,
  structuredFeatures,
} from "@/lib/listing/presentation";
import { floorLabel, formatArea, formatDate } from "@/lib/listing/format";
import { Gallery, type GalleryPhoto } from "./gallery";
import { EnquiryForm } from "./enquiry-form";
import { Wordmark } from "@/components/ui/wordmark";

export type AssetUrls = {
  photo: (photoId: string, variantId: string | null, size: "display" | "thumb") => string;
  floorPlan: (planId: string) => string;
  logo: (workspaceId: string) => string;
  brochure: (lang: "el" | "en") => string | null;
};

const T = {
  el: {
    reference: "Κωδικός αγγελίας",
    updated: "Τελευταία ενημέρωση",
    photos: "Φωτογραφίες",
    description: "Περιγραφή",
    features: "Βασικά χαρακτηριστικά",
    facts: "Στοιχεία ακινήτου",
    rooms: "Οδηγός ανά χώρο",
    plan: "Κάτοψη",
    planHint: "Πατήστε ένα σημείο για να δείτε τις φωτογραφίες του χώρου.",
    tour: "Εικονική περιήγηση",
    tourExternal: "Άνοιγμα εικονικής περιήγησης",
    tourNote: "Εξωτερικός σύνδεσμος που παρείχε ο υπεύθυνος της αγγελίας.",
    missing: "Στοιχεία που δεν έχουν δηλωθεί",
    missingNote: "Ζητήστε τα από τον υπεύθυνο της αγγελίας, αν σας ενδιαφέρουν.",
    staged: "Ορισμένες φωτογραφίες είναι ψηφιακά επιπλωμένες. Τα έπιπλα και η διακόσμηση σε αυτές ενδέχεται να μην υπάρχουν στο ακίνητο.",
    enhanced: "Ορισμένες φωτογραφίες έχουν διόρθωση φωτισμού/χρώματος. Δεν έχουν προστεθεί ή αφαιρεθεί στοιχεία του χώρου.",
    contact: "Επικοινωνία",
    call: "Τηλέφωνο",
    email: "Email",
    brochure: "Λήψη φυλλαδίου (PDF)",
    bedrooms: "υπνοδωμάτια",
    bathrooms: "μπάνια",
    disclaimer:
      "Οι πληροφορίες παρέχονται από τον υπεύθυνο της αγγελίας. Το Flatmarket παρέχει την πλατφόρμα παρουσίασης και δεν ενεργεί ως μεσίτης.",
    otherSpaces: "Χωρίς χώρο",
  },
  en: {
    reference: "Listing reference",
    updated: "Last updated",
    photos: "Photos",
    description: "Description",
    features: "Key features",
    facts: "Property details",
    rooms: "Room-by-room guide",
    plan: "Floor plan",
    planHint: "Tap a marker to see photos of that space.",
    tour: "Virtual tour",
    tourExternal: "Open virtual tour",
    tourNote: "External link provided by the person responsible for this listing.",
    missing: "Information not provided",
    missingNote: "Ask the person responsible for this listing if it matters to you.",
    staged: "Some photos are digitally staged. Furniture and decoration in them may not exist in the property.",
    enhanced: "Some photos have light/colour correction. Nothing has been added to or removed from the spaces.",
    contact: "Contact",
    call: "Phone",
    email: "Email",
    brochure: "Download brochure (PDF)",
    bedrooms: "bedrooms",
    bathrooms: "bathrooms",
    disclaimer:
      "Information is provided by the person responsible for this listing. Flatmarket provides the presentation platform and does not act as an estate agent.",
    otherSpaces: "Unassigned",
  },
};

export function PresentationView({
  p,
  lang,
  urls,
  langHref,
  enquiry,
  banner,
}: {
  p: Presentation;
  lang: "el" | "en";
  urls: AssetUrls;
  langHref: (lang: "el" | "en") => string;
  enquiry: { token: string; formToken: string; preview: boolean } | null;
  banner?: React.ReactNode;
}) {
  const t = T[lang];
  const content = p.content[lang].description || p.content[lang].headline ? p.content[lang] : p.content.el;
  const contentLang = content === p.content[lang] ? lang : "el";
  const title = presentationTitle(p, lang);
  const cover = coverPhoto(p);
  const ordered = cover ? [cover, ...p.photos.filter((x) => x.id !== cover.id)] : p.photos;
  const toGallery = (ph: (typeof p.photos)[number]): GalleryPhoto => ({
    src: urls.photo(ph.id, ph.variantId, "display"),
    thumb: urls.photo(ph.id, ph.variantId, "thumb"),
    alt: `${roomLabel(ph.room, ph.roomLabel, lang)}${ph.caption ? ` — ${ph.caption}` : ""}`,
    staged: ph.kind === "STAGED",
    enhanced: ph.kind === "ENHANCED",
    caption: ph.caption,
  });
  const groups = photosByRoom(p, lang);
  const facts = keyFacts(p, lang);
  const features = [...(content.features ?? []), ...structuredFeatures(p, lang).filter((f) => !(content.features ?? []).includes(f))];
  const missing = missingInformation(p, lang);
  const anyStaged = p.photos.some((ph) => ph.kind === "STAGED");
  const anyEnhanced = p.photos.some((ph) => ph.kind === "ENHANCED");
  const brochure = urls.brochure(lang);
  const showEn = hasEnglish(p);
  const quick = [
    formatArea(p.areaSqm, lang),
    p.bedrooms != null ? `${p.bedrooms} ${t.bedrooms}` : null,
    p.bathrooms != null ? `${p.bathrooms} ${t.bathrooms}` : null,
    floorLabel(p.floor, lang),
  ].filter(Boolean) as string[];
  const recipient = [p.contact.name, p.branding?.displayName].filter((x, i, a) => x && a.indexOf(x) === i).join(" · ") || (lang === "el" ? "Ο υπεύθυνος της αγγελίας" : "The listing owner");

  return (
    <div className="min-h-screen bg-cream" lang={lang}>
      {banner}
      <header className="border-b border-stone-200 bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {p.branding ? (
            <div className="flex min-w-0 items-center gap-3">
              {p.branding.hasLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls.logo(p.branding.workspaceId)} alt="" className="h-9 w-auto max-w-32 object-contain" />
              )}
              <span className="truncate text-sm font-semibold text-ink">{p.branding.displayName}</span>
            </div>
          ) : (
            <span className="text-sm text-ink-muted">{t.reference} {p.reference}</span>
          )}
          {showEn && (
            <nav aria-label="Language" className="flex rounded-full border border-stone-300 p-0.5 text-xs">
              {(["el", "en"] as const).map((lg) => (
                <Link
                  key={lg}
                  href={langHref(lg)}
                  aria-current={lang === lg ? "true" : undefined}
                  className={`rounded-full px-3 py-1 ${lang === lg ? "bg-ink text-paper" : "text-ink-soft"}`}
                  hrefLang={lg}
                >
                  {lg === "el" ? "Ελληνικά" : "English"}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        {ordered.length > 0 && <Gallery photos={ordered.map(toGallery)} lang={lang} layout="hero" />}

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            {p.location && <p className="text-sm font-medium uppercase tracking-wider text-terracotta-600">{p.location}</p>}
            <h1 className="font-display mt-2 text-4xl leading-tight text-ink sm:text-5xl" lang={contentLang}>
              {title}
            </h1>
            <p className="font-display mt-4 text-3xl text-ink">{priceText(p, lang)}</p>
            {quick.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {quick.map((q) => (
                  <li key={q} className="rounded-full border border-stone-300 bg-paper px-3.5 py-1.5 text-sm text-ink">
                    {q}
                  </li>
                ))}
              </ul>
            )}

            {(content.summary || content.description) && (
              <section className="mt-10" aria-labelledby="desc">
                <h2 id="desc" className="font-display text-2xl text-ink">{t.description}</h2>
                {content.summary && (
                  <p className="mt-4 text-lg leading-relaxed text-ink" lang={contentLang}>
                    {content.summary}
                  </p>
                )}
                {content.description && (
                  <div className="prose-listing mt-4 leading-relaxed text-ink-soft" lang={contentLang}>
                    {content.description.split(/\n{2,}/).map((para, i) => (
                      <p key={i} className="whitespace-pre-line">
                        {para}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            )}

            {features.length > 0 && (
              <section className="mt-10" aria-labelledby="features">
                <h2 id="features" className="font-display text-2xl text-ink">{t.features}</h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-ink-soft">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta-500" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {facts.length > 0 && (
              <section className="mt-10" aria-labelledby="facts">
                <h2 id="facts" className="font-display text-2xl text-ink">{t.facts}</h2>
                <dl className="mt-4 grid overflow-hidden rounded-2xl border border-stone-200 bg-paper sm:grid-cols-2">
                  {facts.map((f) => (
                    <div key={f.label} className="flex justify-between gap-4 border-b border-stone-200 px-4 py-3 text-sm sm:odd:border-r">
                      <dt className="text-ink-muted">{f.label}</dt>
                      <dd className="text-right font-medium text-ink">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {missing.length > 0 && (
              <section className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm" aria-labelledby="missing">
                <h2 id="missing" className="font-semibold text-ink">{t.missing}</h2>
                <p className="mt-1 text-ink-soft">{missing.join(" · ")}</p>
                <p className="mt-1 text-xs text-ink-muted">{t.missingNote}</p>
              </section>
            )}

            {p.floorPlans.length > 0 && (
              <section className="mt-10" aria-labelledby="plan">
                <h2 id="plan" className="font-display text-2xl text-ink">{t.plan}</h2>
                {p.floorPlans.some((f) => f.hotspots.length) && <p className="mt-1 text-sm text-ink-muted">{t.planHint}</p>}
                <div className="mt-4 space-y-6">
                  {p.floorPlans.map((f) => (
                    <figure key={f.id}>
                      <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white" style={{ aspectRatio: `${f.width} / ${f.height}` }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={urls.floorPlan(f.id)} alt={`${t.plan}${f.label ? `: ${f.label}` : ""}`} className="h-full w-full object-contain" loading="lazy" />
                        {f.hotspots.map((h, i) => (
                          <a
                            key={i}
                            href={`#${roomAnchor(h.room, h.roomLabel)}`}
                            className="absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-terracotta-600 text-xs font-semibold text-white shadow ring-2 ring-white hover:bg-terracotta-700"
                            style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
                            aria-label={roomLabel(h.room, h.roomLabel, lang)}
                            title={roomLabel(h.room, h.roomLabel, lang)}
                          >
                            {i + 1}
                          </a>
                        ))}
                      </div>
                      {f.label && <figcaption className="mt-2 text-sm text-ink-muted">{f.label}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {groups.length > 0 && (
              <section className="mt-10" aria-labelledby="rooms">
                <h2 id="rooms" className="font-display text-2xl text-ink">{groups.length > 1 ? t.rooms : t.photos}</h2>
                <div className="mt-4 grid gap-x-6 gap-y-8 md:grid-cols-2">
                  {groups.map((g) => (
                    <div key={g.key} id={roomAnchor(g.room, g.photos[0]?.roomLabel ?? null)} className="scroll-mt-6">
                      <h3 className="mb-3 text-base font-semibold text-ink">
                        {g.room ? g.label : t.otherSpaces} <span className="font-normal text-ink-muted">· {g.photos.length}</span>
                      </h3>
                      <Gallery photos={g.photos.map(toGallery)} lang={lang} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {p.tour && (
              <section className="mt-10" aria-labelledby="tour">
                <h2 id="tour" className="font-display text-2xl text-ink">{t.tour}</h2>
                {p.tour.embedUrl ? (
                  <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
                    <iframe
                      src={p.tour.embedUrl}
                      title={`${t.tour}${p.tour.providerName ? ` (${p.tour.providerName})` : ""}`}
                      className="h-full w-full"
                      allow="fullscreen; xr-spatial-tracking"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
                    />
                  </div>
                ) : (
                  <a href={p.tour.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-4 inline-flex rounded-full border border-stone-300 bg-paper px-5 py-2.5 text-sm font-medium hover:bg-stone-100">
                    {t.tourExternal} ↗
                  </a>
                )}
                <p className="mt-2 text-xs text-ink-muted">{t.tourNote}</p>
              </section>
            )}

            {(anyStaged || anyEnhanced) && (
              <section className="mt-10 space-y-2 text-sm">
                {anyStaged && <p className="rounded-2xl border border-amber-700/25 bg-amber-50 p-4 text-amber-700">{t.staged}</p>}
                {anyEnhanced && <p className="text-ink-muted">{t.enhanced}</p>}
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start" aria-labelledby="contact">
            <div className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-5 shadow-[var(--shadow-soft)]">
              <h2 id="contact" className="font-display text-2xl text-ink">{t.contact}</h2>
              {p.contact.name && <p className="mt-2 font-medium text-ink">{p.contact.name}</p>}
              {p.branding && p.branding.displayName !== p.contact.name && <p className="text-sm text-ink-muted">{p.branding.displayName}</p>}
              {p.branding?.registryNumber && <p className="text-xs text-ink-muted">{p.branding.registryNumber}</p>}
              <div className="mt-4 space-y-2">
                {p.contact.phone && (
                  <a href={`tel:${p.contact.phone.replace(/\s/g, "")}`} className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-sm hover:bg-stone-50">
                    <span className="text-ink-muted">{t.call}</span>
                    <span className="font-medium text-ink">{p.contact.phone}</span>
                  </a>
                )}
                {p.contact.email && (
                  <a href={`mailto:${p.contact.email}?subject=${encodeURIComponent(p.reference)}`} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm hover:bg-stone-50">
                    <span className="text-ink-muted">{t.email}</span>
                    <span className="truncate font-medium text-ink">{p.contact.email}</span>
                  </a>
                )}
              </div>
              {p.contact.enquiriesEnabled && enquiry && (
                <div className="mt-5 border-t border-stone-200 pt-5">
                  <EnquiryForm token={enquiry.token} formToken={enquiry.formToken} lang={lang} recipient={recipient} preview={enquiry.preview} />
                </div>
              )}
              {brochure && (
                <a href={brochure} className="mt-5 flex w-full items-center justify-center rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:bg-ink-soft">
                  {t.brochure}
                </a>
              )}
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p>
              {t.reference}: <span className="font-medium text-ink">{p.reference}</span> · {t.updated}: {formatDate(p.updatedAt, lang)}
            </p>
            <p className="mt-1 max-w-2xl">{t.disclaimer}</p>
          </div>
          <Wordmark className="text-sm opacity-70" />
        </div>
      </footer>
    </div>
  );
}
