import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/app/auth-forms";
import { Alert } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Νέος κωδικός", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="font-display text-4xl text-ink">Νέος κωδικός</h1>
      <div className="mt-8">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Alert tone="error">
            Ο σύνδεσμος δεν είναι πλήρης. <Link href="/forgot-password" className="underline">Ζητήστε νέο σύνδεσμο</Link>.
          </Alert>
        )}
      </div>
    </>
  );
}
