// Public site configuration. Business details are intentionally EMPTY until
// you provide real ones — the site never shows invented phone numbers,
// addresses, registration numbers or social profiles.

export const site = {
  name: "Flatmarket",
  tagline: { el: "Καλύτερες αγγελίες. Πιο ξεκάθαρες αποφάσεις.", en: "Better listings. Clearer property decisions." },
  // Fill these in with your real, verified business details before launch.
  business: {
    legalName: "", // e.g. "Flatmarket Μονοπρόσωπη Ι.Κ."
    vatNumber: "", // ΑΦΜ
    gemiNumber: "", // Αρ. ΓΕΜΗ
    address: "",
    publicEmail: "",
    publicPhone: "",
  },
  nav: [
    { href: "/how-it-works", label: "Πώς λειτουργεί" },
    { href: "/services", label: "Υπηρεσίες" },
    { href: "/agencies", label: "Για γραφεία" },
    { href: "/pricing", label: "Τιμές" },
    { href: "/contact", label: "Επικοινωνία" },
  ],
};
