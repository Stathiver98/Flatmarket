import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

const control =
  "block w-full rounded-xl border border-stone-300 bg-paper px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-muted/70 shadow-[inset_0_1px_1px_rgb(0_0_0/0.03)] focus:border-terracotta-500 focus:outline-none focus:ring-2 focus:ring-terracotta-100 disabled:bg-stone-100 aria-[invalid=true]:border-danger-600";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-ink-muted">Προαιρετικό</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs leading-relaxed text-ink-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(control, "min-h-24 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={clsx(control, "appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10", className)} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%237a7268'%3E%3Cpath d='M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z'/%3E%3C/svg%3E")` }} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, hint, className, ...props }: ComponentProps<"input"> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={clsx("flex cursor-pointer items-start gap-3 text-sm text-ink", className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 accent-terracotta-600"
        {...props}
      />
      <span>
        {label}
        {hint && <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** Pill-style choice group (radio or checkbox) that stays usable on mobile. */
export function ChoiceGroup({
  name,
  options,
  defaultValue,
  type = "radio",
  legend,
  hint,
  optional,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string | string[] | null;
  type?: "radio" | "checkbox";
  legend: ReactNode;
  hint?: ReactNode;
  optional?: boolean;
}) {
  const selected = Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [];
  return (
    <fieldset className="space-y-2">
      <legend className="flex w-full items-baseline justify-between gap-2 text-sm font-medium text-ink">
        <span>{legend}</span>
        {optional && <span className="text-xs font-normal text-ink-muted">Προαιρετικό</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input
              type={type}
              name={name}
              value={o.value}
              defaultChecked={selected.includes(o.value)}
              className="peer sr-only"
            />
            <span className="inline-flex items-center rounded-full border border-stone-300 bg-paper px-3.5 py-1.5 text-sm text-ink-soft transition-colors peer-checked:border-terracotta-600 peer-checked:bg-terracotta-50 peer-checked:text-terracotta-700 peer-focus-visible:ring-2 peer-focus-visible:ring-terracotta-500 hover:border-stone-400">
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </fieldset>
  );
}
