"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { addHotspot, deleteFloorPlan, deleteHotspot, renameFloorPlan } from "@/server/actions/photos";
import { ROOM_TYPES } from "@/lib/listing/options";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";

type Plan = {
  id: string;
  label: string | null;
  width: number;
  height: number;
  hotspots: { id: string; x: number; y: number; room: string; roomLabel: string | null }[];
};
type RoomChoice = { room: string; roomLabel: string | null; label: string; photoCount: number };

export function FloorPlanEditor({ plan, rooms }: { plan: Plan; rooms: RoomChoice[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [placing, setPlacing] = useState<RoomChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState(plan.label ?? "");

  const choices: RoomChoice[] = [
    ...rooms,
    ...ROOM_TYPES.filter((r) => !rooms.some((x) => x.room === r.value && !x.roomLabel)).map((r) => ({
      room: r.value,
      roomLabel: null,
      label: `${r.el} (χωρίς φωτογραφίες)`,
      photoCount: 0,
    })),
  ];

  const run = (fn: () => Promise<{ ok?: boolean; error?: string | null } | null>) =>
    start(async () => {
      const r = await fn();
      setError(r && !r.ok ? (r.error ?? "Η αλλαγή δεν αποθηκεύτηκε.") : null);
      router.refresh();
    });

  const nameOf = (h: { room: string; roomLabel: string | null }) =>
    h.roomLabel ?? ROOM_TYPES.find((r) => r.value === h.room)?.el ?? h.room;

  return (
    <div className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-sm">
          <span className="font-medium">Ονομασία κάτοψης</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => label !== (plan.label ?? "") && run(() => renameFloorPlan(plan.id, label))}
            placeholder="π.χ. Ισόγειο, 1ος όροφος"
            maxLength={80}
            className="mt-1 block w-full rounded-xl border border-stone-300 bg-paper px-3 py-2"
          />
        </label>
        <Button variant="danger" size="sm" disabled={pending} onClick={() => window.confirm("Διαγραφή αυτής της κάτοψης και των σημείων της;") && run(() => deleteFloorPlan(plan.id))}>
          Διαγραφή κάτοψης
        </Button>
      </div>

      <div className="mt-4 rounded-2xl bg-stone-50 p-3 text-sm">
        <p className="font-medium">Σημεία χώρων</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Επιλέξτε χώρο και μετά πατήστε πάνω στην κάτοψη, στο σημείο όπου βρίσκεται. Οι επισκέπτες θα μεταφέρονται στις φωτογραφίες
          αυτού του χώρου.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            value={placing ? `${placing.room}|${placing.roomLabel ?? ""}` : ""}
            onChange={(e) => setPlacing(choices.find((c) => `${c.room}|${c.roomLabel ?? ""}` === e.target.value) ?? null)}
            className="rounded-xl border border-stone-300 bg-paper px-3 py-2"
            aria-label="Χώρος για νέο σημείο"
          >
            <option value="">— Επιλέξτε χώρο —</option>
            {choices.map((c) => (
              <option key={`${c.room}|${c.roomLabel ?? ""}`} value={`${c.room}|${c.roomLabel ?? ""}`}>
                {c.label}
                {c.photoCount ? ` (${c.photoCount} φωτ.)` : ""}
              </option>
            ))}
          </select>
          {placing && (
            <span className="self-center text-xs font-medium text-terracotta-700">
              Πατήστε στην κάτοψη για να τοποθετήσετε «{placing.roomLabel ?? placing.label.replace(/ \(.*\)$/, "")}»
            </span>
          )}
        </div>
      </div>
      {error && <Alert tone="error" className="mt-3">{error}</Alert>}

      <div
        className={clsx("relative mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white", placing && "cursor-crosshair")}
        style={{ aspectRatio: `${plan.width} / ${plan.height}` }}
        onClick={(e) => {
          if (!placing || pending) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
          const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
          const p = placing;
          setPlacing(null);
          run(() => addHotspot(plan.id, { x, y, room: p.room as never, roomLabel: p.roomLabel }));
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/files/floorplans/${plan.id}`} alt={plan.label ? `Κάτοψη: ${plan.label}` : "Κάτοψη"} className="h-full w-full object-contain" draggable={false} />
        {plan.hotspots.map((h, i) => (
          <span
            key={h.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-terracotta-600 text-xs font-semibold text-white shadow ring-2 ring-white" title={nameOf(h)}>
              {i + 1}
            </span>
          </span>
        ))}
      </div>

      {plan.hotspots.length > 0 && (
        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {plan.hotspots.map((h, i) => (
            <li key={h.id} className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2">
              <span>
                <span className="mr-2 font-semibold text-terracotta-700">{i + 1}</span>
                {nameOf(h)}
              </span>
              <button type="button" disabled={pending} onClick={() => run(() => deleteHotspot(h.id))} className="text-xs text-danger-600 hover:underline">
                Αφαίρεση
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
