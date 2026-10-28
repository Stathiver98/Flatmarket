"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { deletePhoto, reorderPhotos, setCoverPhoto, updatePhoto } from "@/server/actions/photos";
import { ROOM_TYPES } from "@/lib/listing/options";
import { Uploader } from "./uploader";
import { PhotoVersions, type VariantInfo, type ProviderInfo } from "./photo-versions";
import { Alert, Badge } from "@/components/ui/feedback";

export type PhotoInfo = {
  id: string;
  room: string | null;
  roomLabel: string | null;
  caption: string | null;
  includeInListing: boolean;
  isCover: boolean;
  width: number;
  height: number;
  originalFilename: string;
  selectedVariantId: string | null;
  variants: VariantInfo[];
};

export function PhotoManager({
  listingId,
  photos: initial,
  providers,
  maxPhotos,
}: {
  listingId: string;
  photos: PhotoInfo[];
  providers: ProviderInfo[];
  maxPhotos: number;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [touched, setTouched] = useState(false);
  // Re-sync local (optimistic) state when the server sends fresh data.
  const [synced, setSynced] = useState(initial);
  if (synced !== initial) {
    setSynced(initial);
    setPhotos(initial);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const run = (fn: () => Promise<{ ok?: boolean; error?: string | null } | null>) => {
    setTouched(true);
    start(async () => {
      const r = await fn();
      if (r && !r.ok) setError(r.error ?? "Η αλλαγή δεν αποθηκεύτηκε.");
      else setError(null);
      router.refresh();
    });
  };

  const persistOrder = (next: PhotoInfo[]) => {
    setPhotos(next);
    run(() =>
      reorderPhotos(
        listingId,
        next.map((p) => p.id),
      ),
    );
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = photos.findIndex((p) => p.id === e.active.id);
    const to = photos.findIndex((p) => p.id === e.over!.id);
    persistOrder(arrayMove(photos, from, to));
  };
  const move = (id: string, dir: -1 | 1) => {
    const i = photos.findIndex((p) => p.id === id);
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    persistOrder(arrayMove(photos, i, j));
  };
  const patch = (id: string, changes: Partial<PhotoInfo>) => {
    const next = photos.map((p) => (p.id === id ? { ...p, ...changes } : p));
    setPhotos(next);
    const p = next.find((x) => x.id === id)!;
    run(() =>
      updatePhoto(id, {
        room: (p.room as never) ?? null,
        roomLabel: p.roomLabel,
        caption: p.caption,
        includeInListing: p.includeInListing,
      }),
    );
  };

  const unassigned = photos.filter((p) => p.includeInListing && !p.room).length;
  const open = photos.find((p) => p.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <Uploader endpoint={`/api/listings/${listingId}/photos`} disabled={photos.length >= maxPhotos} />
      <p className="flex flex-wrap justify-between gap-2 text-xs text-ink-muted">
        <span>
          {photos.length} από {maxPhotos} φωτογραφίες. Σύρετε για αλλαγή σειράς (σε κινητό: παρατεταμένο πάτημα) ή χρησιμοποιήστε
          τα κουμπιά ← →.
        </span>
        {touched && (
          <span role="status" aria-live="polite" className={saving ? "text-amber-700" : "text-olive-700"}>
            {saving ? "Αποθήκευση αλλαγών…" : "Όλες οι αλλαγές αποθηκεύτηκαν"}
          </span>
        )}
      </p>
      {error && (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      )}
      {unassigned > 0 && (
        <Alert tone="warning">
          {unassigned === 1 ? "1 φωτογραφία δεν έχει" : `${unassigned} φωτογραφίες δεν έχουν`} αντιστοιχιστεί σε χώρο. Ο οδηγός
          ανά δωμάτιο χρησιμοποιεί μόνο τους χώρους που επιβεβαιώνετε εσείς.
        </Alert>
      )}
      <DndContext id="photo-order" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {photos.map((p, i) => (
              <SortablePhoto
                key={p.id}
                photo={p}
                index={i}
                total={photos.length}
                onMove={move}
                onPatch={patch}
                onCover={() => {
                  setPhotos(
                    photos.map((x) => ({
                      ...x,
                      isCover: x.id === p.id,
                      includeInListing: x.id === p.id ? true : x.includeInListing,
                    })),
                  );
                  run(() => setCoverPhoto(p.id));
                }}
                onDelete={() => {
                  if (!window.confirm("Οριστική διαγραφή της φωτογραφίας και όλων των εκδόσεών της;")) return;
                  setPhotos(photos.filter((x) => x.id !== p.id));
                  run(() => deletePhoto(p.id));
                }}
                onOpenVersions={() => setOpenId(p.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {open && <PhotoVersions photo={open} providers={providers} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function SortablePhoto({
  photo: p,
  index,
  total,
  onMove,
  onPatch,
  onCover,
  onDelete,
  onOpenVersions,
}: {
  photo: PhotoInfo;
  index: number;
  total: number;
  onMove: (id: string, dir: -1 | 1) => void;
  onPatch: (id: string, c: Partial<PhotoInfo>) => void;
  onCover: () => void;
  onDelete: () => void;
  onOpenVersions: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const [label, setLabel] = useState(p.roomLabel ?? "");
  const selected = p.variants.find((v) => v.id === p.selectedVariantId);
  const thumb = selected ? `/api/files/photos/${p.id}?s=thumb&v=${selected.id}` : `/api/files/photos/${p.id}?s=thumb`;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        "overflow-hidden rounded-[var(--radius-card)] border bg-paper",
        isDragging ? "z-10 border-terracotta-500 shadow-[var(--shadow-lift)]" : "border-stone-200",
        !p.includeInListing && "opacity-70",
      )}
    >
      <div
        className="relative aspect-[4/3] cursor-grab touch-manipulation bg-stone-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={`Φωτογραφία ${index + 1}: ${p.originalFilename}. Σύρετε για αλλαγή σειράς.`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt="" className="h-full w-full object-cover" draggable={false} loading="lazy" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <span className="rounded-full bg-ink/80 px-2 py-0.5 text-xs font-medium text-paper">{index + 1}</span>
          {p.isCover && <Badge tone="dark">Εξώφυλλο</Badge>}
          {selected?.kind === "ENHANCED" && <Badge tone="success">Βελτιωμένη</Badge>}
          {selected?.kind === "STAGED" && <Badge tone="warning">Ψηφιακή επίπλωση</Badge>}
          {!p.includeInListing && <Badge>Εκτός αγγελίας</Badge>}
        </div>
      </div>
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-ink-muted">
            Χώρος
            <select
              value={p.room ?? ""}
              onChange={(e) => onPatch(p.id, { room: e.target.value || null })}
              className={clsx(
                "mt-1 block w-full rounded-lg border bg-paper px-2 py-1.5 text-sm text-ink",
                p.room ? "border-stone-300" : "border-amber-700/40 bg-amber-50",
              )}
            >
              <option value="">— Επιλέξτε —</option>
              {ROOM_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.el}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-ink-muted">
            Ονομασία (προαιρ.)
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => label !== (p.roomLabel ?? "") && onPatch(p.id, { roomLabel: label.trim() || null })}
              placeholder="π.χ. Υπνοδωμάτιο 2"
              maxLength={60}
              className="mt-1 block w-full rounded-lg border border-stone-300 bg-paper px-2 py-1.5 text-sm text-ink"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={p.includeInListing}
            onChange={(e) => onPatch(p.id, { includeInListing: e.target.checked })}
            className="h-4 w-4 accent-terracotta-600"
          />
          Περιλαμβάνεται στην αγγελία
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onMove(p.id, -1)}
            disabled={index === 0}
            className="rounded-full border border-stone-300 px-2.5 py-1 text-xs disabled:opacity-40"
            aria-label="Μετακίνηση νωρίτερα"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => onMove(p.id, 1)}
            disabled={index === total - 1}
            className="rounded-full border border-stone-300 px-2.5 py-1 text-xs disabled:opacity-40"
            aria-label="Μετακίνηση αργότερα"
          >
            →
          </button>
          {!p.isCover && (
            <button
              type="button"
              onClick={onCover}
              className="rounded-full border border-stone-300 px-2.5 py-1 text-xs hover:bg-stone-100"
            >
              Ορισμός εξωφύλλου
            </button>
          )}
          <button
            type="button"
            onClick={onOpenVersions}
            className="rounded-full border border-stone-300 px-2.5 py-1 text-xs hover:bg-stone-100"
          >
            Εκδόσεις {p.variants.length > 0 && `(${p.variants.length})`}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto rounded-full px-2.5 py-1 text-xs text-danger-600 hover:bg-danger-50"
          >
            Διαγραφή
          </button>
        </div>
      </div>
    </li>
  );
}
