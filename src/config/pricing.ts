// ---------------------------------------------------------------------------
// Pricing — WORKING ASSUMPTIONS. Edit freely before launch.
//
// - Prices are illustrative proposals, not validated market prices.
// - `vatNote` must reflect your real VAT treatment (confirm with your accountant).
// - `badge` lets you mark a launch offer ONLY if it is genuinely time-limited.
// - Online card payments are NOT enabled; every package leads to a request form.
// ---------------------------------------------------------------------------

export type Package = {
  id: string;
  name: string;
  price: number;
  unit: string;
  fromPrice?: boolean;
  summary: string;
  features: string[];
  limits: string[];
  assisted?: boolean;
  highlighted?: boolean;
  badge?: string;
};

export const pricing = {
  currency: "EUR",
  vatNote: "Οι τιμές δεν περιλαμβάνουν ΦΠΑ 24%.",
  disclaimer:
    "Οι τιμές είναι ενδεικτικές και ενδέχεται να αλλάξουν πριν την επίσημη διάθεση. Η τελική προσφορά επιβεβαιώνεται γραπτώς πριν από οποιαδήποτε χρέωση.",
  paymentNote:
    "Δεν γίνονται ακόμη ηλεκτρονικές πληρωμές. Στείλτε αίτημα και θα επικοινωνήσουμε μαζί σας με αναλυτική προσφορά.",
  packages: [
    {
      id: "essential",
      name: "Essential",
      price: 39,
      unit: "ανά ακίνητο",
      summary: "Για ιδιοκτήτες και μεσίτες που θέλουν μια καθαρή, ολοκληρωμένη παρουσίαση.",
      features: [
        "Καθοδηγούμενη καταχώριση στοιχείων",
        "Έως 30 φωτογραφίες, οργανωμένες ανά χώρο",
        "Βασική διόρθωση φωτογραφιών (φωτεινότητα, χρώμα, ευκρίνεια)",
        "Περιγραφές σε ελληνικά και αγγλικά (με AI, όπου είναι διαθέσιμο, ή χειροκίνητα)",
        "Σελίδα παρουσίασης για κοινοποίηση",
        "PDF φυλλάδιο, φύλλο στοιχείων και πακέτο λήψης",
      ],
      limits: ["Φιλοξενία σελίδας: 6 μήνες", "Απεριόριστες αλλαγές από εσάς κατά τη φιλοξενία"],
    },
    {
      id: "showcase",
      name: "Showcase",
      price: 89,
      unit: "ανά ακίνητο",
      highlighted: true,
      summary: "Πληρέστερη παρουσίαση με κάτοψη, επαγγελματική διόρθωση και ανθρώπινο έλεγχο.",
      features: [
        "Όλα όσα περιλαμβάνει το Essential",
        "Έως 60 φωτογραφίες",
        "Επαγγελματική διόρθωση φωτισμού σε έως 40 φωτογραφίες",
        "Κάτοψη με σημεία χώρων και οδηγός ανά δωμάτιο",
        "Σύνδεσμος εξωτερικής εικονικής περιήγησης, αν υπάρχει",
        "Ανθρώπινος έλεγχος κειμένων από την ομάδα μας (1 γύρος)",
      ],
      limits: ["Φιλοξενία σελίδας: 12 μήνες", "1 γύρος διορθώσεων από την ομάδα"],
      assisted: true,
    },
    {
      id: "showcase-plus",
      name: "Showcase Plus",
      price: 149,
      unit: "ανά ακίνητο",
      summary: "Για ακίνητα που χρειάζονται ιδιαίτερη φροντίδα στην παρουσίαση.",
      features: [
        "Όλα όσα περιλαμβάνει το Showcase",
        "Ψηφιακή επίπλωση (virtual staging) σε έως 3 φωτογραφίες, με σαφή επισήμανση",
        "2 γύροι διορθώσεων από την ομάδα",
        "Προτεραιότητα στην υποστήριξη",
      ],
      limits: ["Φιλοξενία σελίδας: 12 μήνες", "Η ψηφιακή επίπλωση παραδίδεται από συνεργάτη και ελέγχεται από εσάς πριν τη δημοσίευση"],
      assisted: true,
    },
    {
      id: "agency",
      name: "Agency",
      price: 249,
      unit: "τον μήνα",
      fromPrice: true,
      summary: "Για μεσιτικά γραφεία με πολλά ακίνητα και ομάδα.",
      features: [
        "Πολλαπλά ακίνητα σε έναν κοινό χώρο εργασίας",
        "Μέλη ομάδας με πρόσβαση στα ακίνητα του γραφείου",
        "Ενιαία εταιρική εμφάνιση: λογότυπο, στοιχεία επικοινωνίας",
        "Περιγραφές σε ελληνικά και αγγλικά",
        "Σελίδες κοινοποίησης και πακέτα λήψης για κάθε ακίνητο",
        "Υποβοηθούμενες υπηρεσίες κατόπιν συνεννόησης",
      ],
      limits: ["Έως 15 ενεργά ακίνητα στη βασική τιμή", "Ετήσια ή μηνιαία σύμβαση, κατόπιν προσφοράς"],
    },
  ] satisfies Package[],
};

export function formatEuro(n: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
