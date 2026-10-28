import Link from "next/link";
import { clsx } from "clsx";

/**
 * Flatmarket wordmark: set in Noto Serif Display with a small terracotta
 * "floor plan" mark (a square with one open wall). Typography only — no
 * third-party logo assets.
 */
export function Wordmark({ className, href = "/", inverted = false }: { className?: string; href?: string | null; inverted?: boolean }) {
  const content = (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 24 24" className="h-[1.05em] w-[1.05em]" aria-hidden="true">
        <path d="M3 3h18v18H3z" fill="none" stroke="currentColor" strokeWidth="2.2" className={inverted ? "text-paper" : "text-ink"} />
        <path d="M3 12h9v9" fill="none" stroke="#b5532f" strokeWidth="2.2" />
        <path d="M15 3v6" fill="none" stroke="currentColor" strokeWidth="2.2" className={inverted ? "text-paper" : "text-ink"} />
      </svg>
      <span className={clsx("font-display text-[1.35em] leading-none tracking-tight", inverted ? "text-paper" : "text-ink")}>
        Flatmarket
      </span>
    </span>
  );
  if (!href) return content;
  return (
    <Link href={href} aria-label="Flatmarket — αρχική σελίδα" className="inline-flex">
      {content}
    </Link>
  );
}
