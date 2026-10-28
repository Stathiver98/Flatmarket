import type { Metadata } from "next";
import { requireUser, getUserWorkspaces } from "@/server/auth/guards";
import { AppNav } from "@/components/app/app-nav";

export const metadata: Metadata = { title: { default: "Οι αγγελίες μου", template: "%s · Flatmarket" }, robots: { index: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/app");
  const workspaces = await getUserWorkspaces(user.id);
  const hasAgency = workspaces.some((w) => w.type === "AGENCY");
  return (
    <div className="flex min-h-screen flex-col">
      <AppNav user={{ name: user.name, email: user.email, isAdmin: user.role === "ADMIN" }} showTeam={hasAgency} />
      <main id="main" className="flex-1">{children}</main>
    </div>
  );
}
