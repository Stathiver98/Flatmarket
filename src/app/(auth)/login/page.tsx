import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/app/auth-forms";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Σύνδεση" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/app");
  return (
    <>
      <h1 className="font-display text-4xl text-ink">Σύνδεση</h1>
      <p className="mt-2 text-sm text-ink-muted">Συνεχίστε από εκεί που σταματήσατε.</p>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        Δεν έχετε λογαριασμό;{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium text-terracotta-700 underline-offset-4 hover:underline">
          Δημιουργία λογαριασμού
        </Link>
      </p>
    </>
  );
}
