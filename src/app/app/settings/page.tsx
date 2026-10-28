import { requireUser, getUserWorkspaces } from "@/server/auth/guards";
import { integrationStatus } from "@/server/env";
import { BrandingForm, PasswordForm, ProfileForm } from "@/components/app/settings-forms";
import { Badge, Card } from "@/components/ui/feedback";

export const metadata = { title: "Ρυθμίσεις" };

export default async function SettingsPage() {
  const user = await requireUser("/app/settings");
  const workspaces = await getUserWorkspaces(user.id);
  const status = integrationStatus();
  const services = [
    { label: "Δημιουργία κειμένων με AI", on: Boolean(status.aiText), detail: status.aiText ? `Ενεργή (${status.aiText})` : "Δεν έχει ρυθμιστεί — τα κείμενα γράφονται χειροκίνητα" },
    { label: "Επαγγελματική διόρθωση φωτογραφιών", on: Boolean(status.photoEnhancement), detail: status.photoEnhancement ? "Ενεργή (Claid.ai)" : "Δεν έχει ρυθμιστεί — διαθέσιμη η βασική διόρθωση" },
    { label: "Αυτόματη ψηφιακή επίπλωση", on: false, detail: "Μη διαθέσιμη — μόνο μεταφόρτωση εικόνων από σχεδιαστή, με επισήμανση" },
    { label: "Αποστολή email", on: Boolean(status.email), detail: status.email ? "Ενεργή" : "Δεν έχει ρυθμιστεί — τα μηνύματα αποθηκεύονται στον λογαριασμό" },
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <h1 className="font-display text-4xl text-ink">Ρυθμίσεις</h1>
      {workspaces.map((w) => (
        <Card key={w.id} className="p-6">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{w.type === "AGENCY" ? "Στοιχεία γραφείου" : "Στοιχεία εμφάνισης"}</h2>
            <Badge>{w.type === "AGENCY" ? "Γραφείο" : "Ατομικός λογαριασμός"}</Badge>
            {w.role === "OWNER" && <Badge tone="accent">Διαχειριστής</Badge>}
          </div>
          <p className="mb-5 text-sm text-ink-muted">
            Εμφανίζονται στις σελίδες παρουσίασης και στα PDF, και χρησιμοποιούνται ως προεπιλεγμένα στοιχεία επικοινωνίας στις νέες αγγελίες.
          </p>
          <BrandingForm
            canEdit={w.role === "OWNER"}
            v={{
              id: w.id,
              displayName: w.displayName,
              contactName: w.contactName,
              contactEmail: w.contactEmail,
              contactPhone: w.contactPhone,
              website: w.website,
              registryNumber: w.registryNumber,
              hasLogo: Boolean(w.logoKey),
              logoVersion: String(w.updatedAt.getTime()),
              type: w.type,
            }}
          />
        </Card>
      ))}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Προφίλ</h2>
          <p className="mb-4 text-sm text-ink-muted">{user.email}</p>
          <ProfileForm name={user.name} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Κωδικός πρόσβασης</h2>
          <PasswordForm />
        </Card>
      </div>
      <Card className="p-6">
        <h2 className="mb-1 text-lg font-semibold">Διαθέσιμες υπηρεσίες</h2>
        <p className="mb-4 text-sm text-ink-muted">Ποιες εξωτερικές υπηρεσίες έχουν ενεργοποιηθεί σε αυτή την εγκατάσταση.</p>
        <ul className="divide-y divide-stone-200 text-sm">
          {services.map((s) => (
            <li key={s.label} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="font-medium">{s.label}</span>
              <span className={s.on ? "text-olive-700" : "text-ink-muted"}>{s.detail}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
