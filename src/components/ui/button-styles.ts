import { clsx } from "clsx";

// Shared by server and client components.
export type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
export type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-terracotta-600 text-white hover:bg-terracotta-700 shadow-sm",
  dark: "bg-ink text-paper hover:bg-ink-soft",
  secondary: "border border-stone-300 bg-paper text-ink hover:bg-stone-100",
  ghost: "text-ink-soft hover:bg-stone-100 hover:text-ink",
  danger: "border border-danger-600/30 bg-paper text-danger-600 hover:bg-danger-50",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}

