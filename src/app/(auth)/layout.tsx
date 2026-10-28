import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";
import { RoomIllustration } from "@/components/marketing/illustrations";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Wordmark className="text-lg" />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">{children}</main>
        <p className="text-xs text-ink-muted">
          <Link href="/privacy" className="hover:text-ink">Απόρρητο</Link> ·{" "}
          <Link href="/terms" className="hover:text-ink">Όροι</Link>
        </p>
      </div>
      <div className="relative hidden overflow-hidden bg-stone-100 lg:block">
        <RoomIllustration scene="living" />
        <div className="absolute inset-x-10 bottom-10 rounded-3xl bg-paper/90 p-8 backdrop-blur">
          <p className="font-display text-3xl leading-tight text-ink">Καλύτερες αγγελίες. Πιο ξεκάθαρες αποφάσεις.</p>
          <p className="mt-3 text-sm text-ink-soft">Ενδεικτική εικονογράφηση — οι παρουσιάσεις σας θα έχουν τις δικές σας φωτογραφίες.</p>
        </div>
      </div>
    </div>
  );
}
