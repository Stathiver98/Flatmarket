import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/app/auth-forms";
import { getCurrentUser } from "@/server/auth/session";
import { env } from "@/server/env";
import { Alert } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Δημιουργία λογαριασμού" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next, email } = await searchParams;
  if (await getCurrentUser()) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/app");
  const inviteEmail = next?.startsWith("/invite/") && email ? email : undefined;
  return (
    <>
      <h1 className="font-display text-4xl text-ink">Δημιουργία λογαριασμού</h1>
      <p className="mt-2 text-sm text-ink-muted">Ξεκινήστε την πρώτη σας αγγελία σε λίγα λεπτά.</p>
      <div className="mt-8">
        {env.signupMode === "closed" && !inviteEmail ? (
          <Alert tone="info" title="Οι εγγραφές είναι προσωρινά κλειστές">
            Η πλατφόρμα λειτουργεί αυτή τη στιγμή με πρόσκληση.{" "}
            <Link href="/contact?type=DEMO" className="underline underline-offset-2">Ζητήστε πρόσβαση</Link>.
          </Alert>
        ) : (
          <SignupForm next={next} inviteEmail={inviteEmail} />
        )}
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        Έχετε ήδη λογαριασμό;{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-terracotta-700 underline-offset-4 hover:underline">
          Σύνδεση
        </Link>
      </p>
    </>
  );
}
