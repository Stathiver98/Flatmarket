"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryPhoto = { src: string; thumb: string; alt: string; staged: boolean; enhanced: boolean; caption: string | null };

const T = {
  el: { staged: "Ψηφιακή επίπλωση", stagedNote: "Τα έπιπλα και η διακόσμηση ενδέχεται να μην υπάρχουν στο ακίνητο.", close: "Κλείσιμο", prev: "Προηγούμενη", next: "Επόμενη", all: "Όλες οι φωτογραφίες", of: "από" },
  en: { staged: "Digitally staged", stagedNote: "Furniture and decoration may not exist in the property.", close: "Close", prev: "Previous", next: "Next", all: "All photos", of: "of" },
};

export function StagedLabel({ lang }: { lang: "el" | "en" }) {
  return (
    <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-medium text-paper">
      {T[lang].staged}
    </span>
  );
}

/** Photo grid with an accessible full-screen viewer (keyboard and swipe friendly). */
export function Gallery({ photos, lang, layout = "grid" }: { photos: GalleryPhoto[]; lang: "el" | "en"; layout?: "grid" | "hero" }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const t = T[lang];
  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const go = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (index === null) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);
  const touchX = useRef<number | null>(null);
  const current = index !== null ? photos[index] : null;

  return (
    <>
      {layout === "hero" ? (
        <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
          {photos.slice(0, 5).map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => open(i)}
              className={`relative overflow-hidden bg-stone-200 ${i === 0 ? "aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:h-full sm:rounded-l-[1.5rem]" : "hidden aspect-[4/3] sm:block"} ${i === 2 ? "sm:rounded-tr-[1.5rem]" : ""} ${i === 4 ? "sm:rounded-br-[1.5rem]" : ""} rounded-2xl sm:rounded-none`}
              aria-label={`${p.alt}${p.staged ? ` — ${t.staged}` : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i === 0 ? p.src : p.thumb} alt="" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]" loading={i === 0 ? "eager" : "lazy"} />
              {p.staged && <StagedLabel lang={lang} />}
              {i === 4 && photos.length > 5 && (
                <span className="absolute inset-0 grid place-items-center bg-ink/45 text-sm font-medium text-paper">+{photos.length - 5}</span>
              )}
            </button>
          ))}
          {photos.length > 1 && (
            <button type="button" onClick={() => open(0)} className="rounded-full border border-stone-300 bg-paper px-4 py-2 text-sm sm:hidden">
              {t.all} ({photos.length})
            </button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {photos.map((p, i) => (
            <li key={p.src}>
              <button type="button" onClick={() => open(i)} className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-stone-200" aria-label={`${p.alt}${p.staged ? ` — ${t.staged}` : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                {p.staged && <StagedLabel lang={lang} />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <dialog
        ref={dialogRef}
        onClose={() => setIndex(null)}
        className="m-0 h-full max-h-none w-full max-w-none bg-ink/95 p-0 text-paper backdrop:bg-ink/80"
        aria-label={current?.alt}
      >
        {current && (
          <div
            className="flex h-full flex-col"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
              touchX.current = null;
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {(index ?? 0) + 1} {t.of} {photos.length}
              </span>
              <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-full border border-white/30 px-4 py-1.5 hover:bg-white/10">
                {t.close}
              </button>
            </div>
            <div className="relative flex flex-1 items-center justify-center px-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.src} alt={current.alt} className="max-h-[78vh] max-w-full object-contain" />
              {photos.length > 1 && (
                <>
                  <button type="button" onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 hover:bg-white/20" aria-label={t.prev}>
                    ←
                  </button>
                  <button type="button" onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 hover:bg-white/20" aria-label={t.next}>
                    →
                  </button>
                </>
              )}
            </div>
            <div className="px-4 py-4 text-center text-sm text-stone-300">
              <p>{current.caption ?? current.alt}</p>
              {current.staged && (
                <p className="mt-1 font-medium text-amber-50">
                  {t.staged} — {t.stagedNote}
                </p>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
