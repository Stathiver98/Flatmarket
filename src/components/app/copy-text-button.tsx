"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";

export function CopyTextButton({ text, label, emptyLabel }: { text: string; label: string; emptyLabel: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) {
    return <p className="rounded-full border border-dashed border-stone-300 px-4 py-2.5 text-center text-xs text-ink-muted">{emptyLabel}</p>;
  }
  return (
    <button
      type="button"
      className={buttonClass("secondary", "md", "h-auto! min-h-10 whitespace-normal! py-2 text-center")}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? "Αντιγράφηκε ✓" : label}
    </button>
  );
}
