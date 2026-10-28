import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/app/auth-forms";

export const metadata: Metadata = { title: "Επαναφορά κωδικού" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-4xl text-ink">Επαναφορά κωδικού</h1>
      <p className="mt-2 text-sm text-ink-muted">Θα σας στείλουμε σύνδεσμο για να ορίσετε νέο κωδικό.</p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-8 text-sm">
        <Link href="/login" className="text-terracotta-700 underline-offset-4 hover:underline">← Επιστροφή στη σύνδεση</Link>
      </p>
    </>
  );
}
