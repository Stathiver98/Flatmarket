"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 20 * 1024 * 1024;

type Item = { key: string; name: string; progress: number; status: "queued" | "uploading" | "done" | "error"; error?: string };

function uploadOne(url: string, file: File, extra: Record<string, string>, onProgress: (p: number) => void) {
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: { ok?: boolean; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.ok) resolve({ ok: true });
      else resolve({ ok: false, error: body.error ?? `Η μεταφόρτωση απέτυχε (σφάλμα ${xhr.status}).` });
    };
    xhr.onerror = () => resolve({ ok: false, error: "Πρόβλημα σύνδεσης. Ελέγξτε το δίκτυο και δοκιμάστε ξανά." });
    const fd = new FormData();
    fd.append("file", file);
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    xhr.send(fd);
  });
}

/** Client-side checks give instant feedback; the server re-validates the actual bytes. */
export function precheck(file: File): string | null {
  if (/\.(heic|heif)$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif") {
    return "Οι φωτογραφίες HEIC (iPhone) δεν υποστηρίζονται ακόμη. Εξαγάγετέ τις ως JPEG και δοκιμάστε ξανά.";
  }
  if (file.type && !ACCEPT.includes(file.type)) return "Μη υποστηριζόμενος τύπος αρχείου. Δεκτές μορφές: JPEG, PNG, WebP.";
  if (file.size > MAX_BYTES) return `Το αρχείο είναι ${(file.size / 1024 / 1024).toFixed(1)} MB — το όριο είναι 20 MB.`;
  return null;
}

export function Uploader({
  endpoint,
  multiple = true,
  extraFields = {},
  label = "Σύρετε φωτογραφίες εδώ ή επιλέξτε αρχεία",
  hint = "JPEG, PNG ή WebP, έως 20 MB ανά αρχείο. Τα πρωτότυπα διατηρούνται αναλλοίωτα.",
  disabled,
  onDone,
  compact = false,
}: {
  endpoint: string;
  multiple?: boolean;
  extraFields?: Record<string, string>;
  label?: string;
  hint?: string;
  disabled?: boolean;
  onDone?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const busy = items.some((i) => i.status === "uploading" || i.status === "queued");

  const start = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const batch: Item[] = files.map((f, i) => {
        const err = precheck(f);
        return { key: `${Date.now()}-${i}-${f.name}`, name: f.name, progress: 0, status: err ? "error" : "queued", error: err ?? undefined };
      });
      setItems((prev) => [...prev.filter((p) => p.status !== "done"), ...batch]);
      let anyOk = false;
      // Upload two at a time: fast, but gentle on mobile connections.
      const queue = batch.map((b, i) => ({ b, f: files[i] })).filter(({ b }) => b.status === "queued");
      const worker = async () => {
        while (queue.length) {
          const { b, f } = queue.shift()!;
          setItems((prev) => prev.map((p) => (p.key === b.key ? { ...p, status: "uploading" } : p)));
          const res = await uploadOne(endpoint, f, extraFields, (progress) =>
            setItems((prev) => prev.map((p) => (p.key === b.key ? { ...p, progress } : p))),
          );
          if (res.ok) anyOk = true;
          setItems((prev) =>
            prev.map((p) => (p.key === b.key ? { ...p, progress: 100, status: res.ok ? "done" : "error", error: res.error } : p)),
          );
        }
      };
      await Promise.all([worker(), worker()]);
      if (anyOk) {
        router.refresh();
        onDone?.();
      }
    },
    [endpoint, extraFields, router, onDone],
  );

  const errors = items.filter((i) => i.status === "error");
  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!disabled) start(Array.from(e.dataTransfer.files).slice(0, multiple ? 60 : 1));
        }}
        className={clsx(
          "flex flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed text-center transition-colors",
          compact ? "px-4 py-5" : "px-6 py-10",
          drag ? "border-terracotta-500 bg-terracotta-50" : "border-stone-300 bg-paper",
          disabled && "opacity-60",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-stone-400" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4 16.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2.5M12 4v12m0-12 4.5 4.5M12 4 7.5 8.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="mt-2 text-sm font-medium text-ink">{label}</p>
        <p className="mt-1 max-w-md text-xs text-ink-muted">{hint}</p>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-soft disabled:opacity-50"
        >
          {busy ? "Μεταφόρτωση…" : "Επιλογή αρχείων"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          multiple={multiple}
          className="sr-only"
          aria-label={label}
          onChange={(e) => {
            start(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>
      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5" aria-live="polite">
          {items.map((i) => (
            <li key={i.key} className="rounded-xl border border-stone-200 bg-paper px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-ink">{i.name}</span>
                <span
                  className={clsx(
                    "shrink-0 text-xs",
                    i.status === "error" ? "text-danger-600" : i.status === "done" ? "text-olive-700" : "text-ink-muted",
                  )}
                >
                  {i.status === "queued" && "Σε αναμονή"}
                  {i.status === "uploading" && `${i.progress}%`}
                  {i.status === "done" && "Ολοκληρώθηκε"}
                  {i.status === "error" && "Απορρίφθηκε"}
                </span>
              </div>
              {i.status === "uploading" && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-200">
                  <div className="h-full bg-terracotta-600 transition-[width]" style={{ width: `${i.progress}%` }} />
                </div>
              )}
              {i.error && <p className="mt-1 text-xs text-danger-600">{i.error}</p>}
            </li>
          ))}
        </ul>
      )}
      {errors.length > 0 && !busy && (
        <button type="button" className="mt-2 text-xs text-ink-muted underline" onClick={() => setItems((p) => p.filter((x) => x.status !== "error"))}>
          Απόκρυψη μηνυμάτων σφάλματος
        </button>
      )}
    </div>
  );
}
