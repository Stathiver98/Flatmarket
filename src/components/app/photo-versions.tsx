"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { approveStagedVariant, deleteVariant, enhancePhoto, selectPhotoVersion } from "@/server/actions/photos";
import { Alert, Badge } from "@/components/ui/feedback";
import { Button, Spinner } from "@/components/ui/button";
import { Uploader } from "./uploader";
import type { PhotoInfo } from "./photo-manager";

export type VariantInfo = {
  id: string;
  kind: "ENHANCED" | "STAGED";
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  provider: string;
  providerLabel: string;
  errorMessage: string | null;
  approvedAt: string | null;
  createdAt: string;
  attempts: number;
};

export type ProviderInfo = { id: string; name: string; description: string; configured: boolean };

export function PhotoVersions({ photo, providers, onClose }: { photo: PhotoInfo; providers: ProviderInfo[]; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [compareId, setCompareId] = useState<string | null>(photo.selectedVariantId ?? photo.variants.find((v) => v.status === "SUCCEEDED")?.id ?? null);
  const [ackStaging, setAckStaging] = useState(false);
  // When a new version arrives (enhancement finished or upload completed), show it for comparison.
  const [seenVariants, setSeenVariants] = useState(photo.variants.length);
  if (photo.variants.length !== seenVariants) {
    setSeenVariants(photo.variants.length);
    if (photo.variants.length > seenVariants) {
      const newest = photo.variants.find((v) => v.status === "SUCCEEDED");
      if (newest) setCompareId(newest.id);
    }
  }
  const [confirmReview, setConfirmReview] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const run = (fn: () => Promise<{ ok?: boolean; error?: string | null; message?: string | null } | null>, provider?: string) =>
    start(async () => {
      setBusyProvider(provider ?? null);
      const r = await fn();
      setBusyProvider(null);
      if (r?.ok) setMsg(r.message ? { tone: "success", text: r.message } : null);
      else setMsg({ tone: "error", text: r?.error ?? "Η ενέργεια απέτυχε." });
      router.refresh();
    });

  const compare = photo.variants.find((v) => v.id === compareId && v.status === "SUCCEEDED") ?? null;
  const original = `/api/files/photos/${photo.id}?s=display`;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-[min(1100px,calc(100vw-1.5rem))] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[var(--radius-card)] border border-stone-200 bg-paper p-0 text-ink backdrop:bg-ink/50"
      aria-labelledby="versions-title"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-paper px-5 py-4">
        <h2 id="versions-title" className="font-display text-2xl">Εκδόσεις φωτογραφίας</h2>
        <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-full border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100">
          Κλείσιμο
        </button>
      </div>
      <div className="space-y-6 p-5">
        {msg && <Alert tone={msg.tone} role={msg.tone === "error" ? "alert" : "status"}>{msg.text}</Alert>}

        <div className="grid gap-4 md:grid-cols-2">
          <figure>
            <div className="overflow-hidden rounded-xl bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={original} alt="Πρωτότυπη φωτογραφία" className="w-full object-contain" />
            </div>
            <figcaption className="mt-2 flex items-center justify-between text-sm">
              <span className="font-medium">Πρωτότυπο</span>
              {!photo.selectedVariantId ? (
                <Badge tone="success">Χρησιμοποιείται</Badge>
              ) : (
                <button type="button" disabled={pending} onClick={() => run(() => selectPhotoVersion(photo.id, null))} className="text-terracotta-700 underline-offset-4 hover:underline">
                  Χρήση πρωτοτύπου
                </button>
              )}
            </figcaption>
          </figure>
          <figure>
            <div className="relative grid min-h-48 place-items-center overflow-hidden rounded-xl bg-stone-100">
              {compare ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/files/photos/${photo.id}?s=display&v=${compare.id}`} alt={compare.kind === "STAGED" ? "Ψηφιακά επιπλωμένη εκδοχή" : "Βελτιωμένη εκδοχή"} className="w-full object-contain" />
                  {compare.kind === "STAGED" && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-ink/85 px-3 py-1 text-xs font-medium text-paper">
                      Ψηφιακή επίπλωση / Digitally staged
                    </span>
                  )}
                </>
              ) : (
                <p className="p-6 text-center text-sm text-ink-muted">Δεν υπάρχει ακόμη άλλη έκδοση για σύγκριση.</p>
              )}
            </div>
            {compare && (
              <figcaption className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {compare.kind === "STAGED" ? "Ψηφιακή επίπλωση" : "Βελτιωμένη"} · {compare.providerLabel}
                </span>
                {photo.selectedVariantId === compare.id ? (
                  <Badge tone="success">Χρησιμοποιείται</Badge>
                ) : compare.kind === "STAGED" && !compare.approvedAt ? (
                  <Badge tone="warning">Απαιτεί έλεγχο</Badge>
                ) : (
                  <button type="button" disabled={pending} onClick={() => run(() => selectPhotoVersion(photo.id, compare.id))} className="text-terracotta-700 underline-offset-4 hover:underline">
                    Χρήση αυτής της έκδοσης
                  </button>
                )}
              </figcaption>
            )}
          </figure>
        </div>

        {compare?.kind === "STAGED" && !compare.approvedAt && (
          <div className="rounded-2xl border border-amber-700/30 bg-amber-50 p-4 text-sm text-amber-700">
            <p className="font-semibold">Έλεγχος ψηφιακής επίπλωσης</p>
            <p className="mt-1">
              Τα έπιπλα και η διακόσμηση σε αυτή την εικόνα ενδέχεται να μην υπάρχουν στο ακίνητο. Η εικόνα θα εμφανίζεται πάντα με την
              ένδειξη «Ψηφιακή επίπλωση» και δίπλα στο πρωτότυπο. Βεβαιωθείτε ότι δεν έχουν αλλοιωθεί τοίχοι, ανοίγματα, δάπεδα ή θέα.
            </p>
            <label className="mt-3 flex items-start gap-2 text-ink">
              <input type="checkbox" checked={confirmReview} onChange={(e) => setConfirmReview(e.target.checked)} className="mt-0.5 h-4 w-4 accent-terracotta-600" />
              Έλεγξα την εικόνα: η δομή του χώρου είναι ίδια με το πρωτότυπο και αποδέχομαι τη δημοσίευσή της με σαφή επισήμανση.
            </label>
            <Button className="mt-3" size="sm" disabled={!confirmReview || pending} onClick={() => run(() => approveStagedVariant(compare.id, confirmReview))}>
              Έγκριση ψηφιακής επίπλωσης
            </Button>
          </div>
        )}

        <section>
          <h3 className="font-semibold">Βελτίωση φωτογραφίας</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Η βελτίωση εφαρμόζεται πάντα στο πρωτότυπο και αποθηκεύεται ως ξεχωριστή έκδοση. Δεν αφαιρούνται ατέλειες, δεν αλλάζουν δομικά
            στοιχεία και δεν προστίθενται αντικείμενα ή θέα.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {providers.map((p) => (
              <div key={p.id} className={clsx("rounded-2xl border p-4", p.configured ? "border-stone-200" : "border-dashed border-stone-300 bg-stone-50")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{p.name}</p>
                  {!p.configured && <Badge>Δεν έχει ρυθμιστεί</Badge>}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{p.description}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  disabled={!p.configured || pending}
                  onClick={() => run(() => enhancePhoto(photo.id, p.id), p.id)}
                >
                  {busyProvider === p.id && <Spinner />}
                  {busyProvider === p.id ? "Επεξεργασία…" : "Δημιουργία βελτιωμένης έκδοσης"}
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Uploader
              endpoint={`/api/photos/${photo.id}/variants`}
              multiple={false}
              compact
              extraFields={{ kind: "ENHANCED" }}
              label="Ή ανεβάστε μια επαγγελματικά επεξεργασμένη έκδοση"
              hint="Για φωτογραφίες που επεξεργάστηκε φωτογράφος. Πρέπει να απεικονίζουν τον ίδιο χώρο χωρίς αλλοιώσεις."
            />
          </div>
        </section>

        <section>
          <h3 className="font-semibold">Ψηφιακή επίπλωση (virtual staging)</h3>
          <Alert tone="neutral" className="mt-2">
            Η αυτόματη ψηφιακή επίπλωση δεν είναι διαθέσιμη: δεν έχει ρυθμιστεί πάροχος που να πληροί τις απαιτήσεις μας για πιστότητα και
            δικαιώματα χρήσης. Μπορείτε να ανεβάσετε εικόνα που ετοίμασε σχεδιαστής — θα επισημαίνεται πάντα ως «Ψηφιακή επίπλωση».
          </Alert>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={ackStaging} onChange={(e) => setAckStaging(e.target.checked)} className="mt-0.5 h-4 w-4 accent-terracotta-600" />
            Κατανοώ ότι η εικόνα θα εμφανίζεται με την ένδειξη «Ψηφιακή επίπλωση / Digitally staged» και ότι πρέπει να την ελέγξω πριν τη
            δημοσίευση.
          </label>
          <div className="mt-3">
            <Uploader
              endpoint={`/api/photos/${photo.id}/variants`}
              multiple={false}
              compact
              disabled={!ackStaging}
              extraFields={{ kind: "STAGED", acknowledge: ackStaging ? "on" : "" }}
              label="Μεταφόρτωση ψηφιακά επιπλωμένης εικόνας"
              hint="Η εικόνα πρέπει να βασίζεται σε αυτή τη φωτογραφία, χωρίς αλλαγές στη δομή του χώρου."
            />
          </div>
        </section>

        {photo.variants.length > 0 && (
          <section>
            <h3 className="font-semibold">Όλες οι εκδόσεις</h3>
            <ul className="mt-2 divide-y divide-stone-200 rounded-2xl border border-stone-200">
              {photo.variants.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{v.kind === "STAGED" ? "Ψηφιακή επίπλωση" : "Βελτιωμένη"}</span>
                  <span className="text-ink-muted">{v.providerLabel}</span>
                  {v.status === "SUCCEEDED" && <Badge tone="success">Έτοιμη</Badge>}
                  {(v.status === "PENDING" || v.status === "PROCESSING") && <Badge tone="warning">Σε επεξεργασία</Badge>}
                  {v.status === "FAILED" && <Badge tone="danger">Απέτυχε</Badge>}
                  {v.kind === "STAGED" && v.status === "SUCCEEDED" && (v.approvedAt ? <Badge>Εγκεκριμένη</Badge> : <Badge tone="warning">Χωρίς έγκριση</Badge>)}
                  {v.errorMessage && <span className="basis-full text-xs text-danger-600">{v.errorMessage}</span>}
                  <span className="ml-auto flex gap-2">
                    {v.status === "SUCCEEDED" && (
                      <button type="button" onClick={() => setCompareId(v.id)} className="text-xs text-terracotta-700 hover:underline">
                        Σύγκριση
                      </button>
                    )}
                    {v.status === "FAILED" && v.provider !== "manual-upload" && (
                      <button type="button" disabled={pending} onClick={() => run(() => enhancePhoto(photo.id, v.provider, v.id), v.provider)} className="text-xs text-terracotta-700 hover:underline">
                        Επανάληψη
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => window.confirm("Διαγραφή αυτής της έκδοσης; Το πρωτότυπο δεν επηρεάζεται.") && run(() => deleteVariant(v.id))}
                      className="text-xs text-danger-600 hover:underline"
                    >
                      Διαγραφή
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </dialog>
  );
}
