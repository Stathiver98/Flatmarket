"use client";

import Link from "next/link";
import { useTransition } from "react";
import { archiveListing, restoreListing, unpublishListing } from "@/server/actions/listings";
import { buttonClass } from "@/components/ui/button";

export function ListingRowActions({ listingId, status, canDownload }: { listingId: string; status: string; canDownload: boolean }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const r = (await fn()) as { ok?: boolean; error?: string } | null;
      if (r && !r.ok && r.error) window.alert(r.error);
    });
  };
  return (
    <>
      <Link href={`/app/listings/${listingId}/preview`} className={buttonClass("secondary", "sm")}>
        Προεπισκόπηση
      </Link>
      {status === "PUBLISHED" ? (
        <button
          type="button"
          disabled={pending}
          className={buttonClass("secondary", "sm")}
          onClick={() => run(() => unpublishListing(listingId), "Απόσυρση της αγγελίας; Η σελίδα δεν θα είναι πλέον διαθέσιμη.")}
        >
          Απόσυρση
        </button>
      ) : status !== "ARCHIVED" ? (
        <Link href={`/app/listings/${listingId}/share`} className={buttonClass("secondary", "sm")}>
          Δημοσίευση
        </Link>
      ) : null}
      {canDownload && (
        <a href={`/api/listings/${listingId}/export/package`} className={buttonClass("ghost", "sm")}>
          Λήψη πακέτου
        </a>
      )}
      {status === "ARCHIVED" ? (
        <button type="button" disabled={pending} className={buttonClass("ghost", "sm")} onClick={() => run(() => restoreListing(listingId))}>
          Επαναφορά
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          className={buttonClass("ghost", "sm")}
          onClick={() => run(() => archiveListing(listingId), "Αρχειοθέτηση της αγγελίας; Αν είναι δημοσιευμένη, θα αποσυρθεί.")}
        >
          Αρχειοθέτηση
        </button>
      )}
    </>
  );
}
