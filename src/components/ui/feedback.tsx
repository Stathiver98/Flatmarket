import { clsx } from "clsx";
import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "error" | "neutral";

const tones: Record<Tone, string> = {
  info: "border-stone-300 bg-stone-50 text-ink-soft",
  neutral: "border-stone-200 bg-paper text-ink-soft",
  success: "border-olive-100 bg-olive-50 text-olive-700",
  warning: "border-amber-700/20 bg-amber-50 text-amber-700",
  error: "border-danger-600/25 bg-danger-50 text-danger-600",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  return (
    <div className={clsx("rounded-2xl border px-4 py-3 text-sm leading-relaxed", tones[tone], className)} role={role}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={clsx(title && "mt-1")}>{children}</div>}
    </div>
  );
}

const badgeTones: Record<string, string> = {
  neutral: "bg-stone-100 text-ink-soft",
  accent: "bg-terracotta-50 text-terracotta-700",
  success: "bg-olive-50 text-olive-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-danger-50 text-danger-600",
  dark: "bg-ink text-paper",
};

export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof badgeTones; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

const statusTone: Record<string, keyof typeof badgeTones> = {
  DRAFT: "neutral",
  AWAITING_REVIEW: "warning",
  READY: "accent",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
};
const statusLabel: Record<string, string> = {
  DRAFT: "Πρόχειρο",
  AWAITING_REVIEW: "Σε έλεγχο",
  READY: "Έτοιμο",
  PUBLISHED: "Δημοσιευμένο",
  ARCHIVED: "Αρχειοθετημένο",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "neutral"}>{statusLabel[status] ?? status}</Badge>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("rounded-[var(--radius-card)] border border-stone-200 bg-paper shadow-[var(--shadow-soft)]", className)}>{children}</div>;
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-stone-300 bg-paper/60 px-6 py-12 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{children}</div>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Progress({ value, label, tone = "accent" }: { value: number; label?: string; tone?: "accent" | "olive" }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-stone-200"
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={clsx("h-full rounded-full transition-[width]", tone === "olive" ? "bg-olive-600" : "bg-terracotta-600")}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/** Form-level result message for server actions. */
export function FormMessage({ state }: { state: { ok?: boolean; error?: string | null; message?: string | null } | null | undefined }) {
  if (!state) return null;
  if (state.error) return <Alert tone="error" role="alert">{state.error}</Alert>;
  if (state.ok && state.message) return <Alert tone="success" role="status">{state.message}</Alert>;
  return null;
}
