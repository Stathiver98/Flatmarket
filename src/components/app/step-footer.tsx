"use client";

import { useFormStatus } from "react-dom";
import { buttonClass, Spinner } from "@/components/ui/button";
import { useActionFormPending } from "@/components/ui/action-form";

/** Sticky save bar: "Save" keeps you on the step, "Save & continue" moves on. */
export function StepFooter({ nextLabel = "Αποθήκευση & συνέχεια", hideNext = false }: { nextLabel?: string; hideNext?: boolean }) {
  const status = useFormStatus();
  const ctx = useActionFormPending();
  const pending = ctx ?? status.pending;
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex flex-col-reverse gap-2 border-t border-stone-200 bg-cream/95 px-4 py-4 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-2xl sm:border sm:px-4">
      <button type="submit" name="intent" value="save" disabled={pending} className={buttonClass("secondary", "md")}>
        {pending && <Spinner />}
        Αποθήκευση πρόχειρου
      </button>
      {!hideNext && (
        <button type="submit" name="intent" value="next" disabled={pending} className={buttonClass("primary", "md")}>
          {pending && <Spinner />}
          {nextLabel}
        </button>
      )}
    </div>
  );
}

export function StepHeader({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-600">Βήμα {n} από 8</p>
      <h2 className="font-display mt-1 text-3xl text-ink">{title}</h2>
      {children && <div className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">{children}</div>}
    </div>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-stone-200 bg-paper p-5 sm:p-6">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}
