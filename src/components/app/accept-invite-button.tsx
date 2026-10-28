"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitation } from "@/server/actions/workspace";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export function AcceptInviteButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await acceptInvitation(token);
            if (r?.ok) router.push("/app");
            else setError(r?.error ?? "Η αποδοχή απέτυχε.");
          })
        }
      >
        Αποδοχή πρόσκλησης
      </Button>
    </div>
  );
}
