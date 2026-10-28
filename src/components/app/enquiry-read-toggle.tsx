"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markEnquiryRead } from "@/server/actions/workspace";

export function EnquiryReadToggle({ id, read }: { id: string; read: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className="ml-auto text-xs text-ink-soft underline-offset-2 hover:underline"
      onClick={() => start(async () => { await markEnquiryRead(id, !read); router.refresh(); })}
    >
      {read ? "Σήμανση ως μη αναγνωσμένο" : "Σήμανση ως αναγνωσμένο"}
    </button>
  );
}
