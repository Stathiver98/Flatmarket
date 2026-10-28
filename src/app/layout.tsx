import type { Metadata, Viewport } from "next";
import { commissioner, notoSerifDisplay } from "./fonts";
import "./globals.css";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Flatmarket — Καλύτερες αγγελίες. Πιο ξεκάθαρες αποφάσεις.",
    template: "%s · Flatmarket",
  },
  description:
    "Δημιουργήστε επαγγελματικές παρουσιάσεις ακινήτων: οργανωμένες φωτογραφίες, ακριβείς περιγραφές στα ελληνικά και αγγλικά, σελίδα κοινοποίησης και PDF.",
  openGraph: {
    siteName: "Flatmarket",
    locale: "el_GR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={`${commissioner.variable} ${notoSerifDisplay.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
