import "server-only";
import JSZip from "jszip";
import type { Presentation } from "@/lib/listing/presentation";
import { keyFacts, presentationTitle, priceText, roomLabel } from "@/lib/listing/presentation";
import { formatDate, slugify } from "@/lib/listing/format";
import { CONTENT_KEYS, CONTENT_KEY_LABELS } from "@/lib/listing/options";
import { loadPhotoBuffer } from "./images";
import { renderBrochure, renderFactsheet } from "./pdf";

function photoFilename(i: number, ph: Presentation["photos"][number]) {
  const room = slugify(roomLabel(ph.room, ph.roomLabel, "el")) || "photo";
  const suffix = ph.kind === "STAGED" ? "_digitally-staged" : ph.kind === "ENHANCED" ? "_enhanced" : "";
  return `${String(i + 1).padStart(2, "0")}_${room}${suffix}.jpg`;
}

async function addPhotos(zip: JSZip, p: Presentation, folder: string) {
  const dir = zip.folder(folder)!;
  let i = 0;
  for (const ph of p.photos) {
    const buf = await loadPhotoBuffer(p.listingId, ph, "full");
    if (!buf) continue;
    dir.file(photoFilename(i++, ph), buf);
  }
  return i;
}

function textsFor(p: Presentation, lang: "el" | "en") {
  const c = p.content[lang];
  const parts: string[] = [];
  for (const key of CONTENT_KEYS) {
    const value = key === "features" ? (c.features.length ? c.features.join("\n") : null) : c[key];
    if (!value) continue;
    parts.push(`## ${CONTENT_KEY_LABELS[key].el}\n\n${value}`);
  }
  return parts.join("\n\n");
}

export async function buildPhotosZip(p: Presentation) {
  const zip = new JSZip();
  const count = await addPhotos(zip, p, "photos");
  zip.file(
    "README.txt",
    `Φωτογραφίες αγγελίας ${p.reference} (${count})\n\nΤα αρχεία δεν περιέχουν μεταδεδομένα κάμερας/τοποθεσίας.\nΤα αρχεία με "_digitally-staged" είναι ψηφιακά επιπλωμένα και πρέπει να επισημαίνονται ως «Ψηφιακή επίπλωση» όπου δημοσιεύονται.\nΤα αρχεία με "_enhanced" έχουν διόρθωση φωτισμού/χρώματος.\n`,
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
}

export async function buildPackageZip(p: Presentation) {
  const zip = new JSZip();
  const count = await addPhotos(zip, p, "photos");
  const el = textsFor(p, "el");
  const en = textsFor(p, "en");
  if (el) zip.file("texts/el.txt", el);
  if (en) zip.file("texts/en.txt", en);
  const facts = keyFacts(p, "el").map((f) => `${f.label}: ${f.value}`).join("\n");
  zip.file("texts/facts_el.txt", `${presentationTitle(p, "el")}\n${p.location ?? ""}\n${priceText(p, "el")}\n\n${facts}\n`);
  zip.file("brochure_el.pdf", await renderBrochure(p, "el"));
  if (p.content.en.headline || p.content.en.description) zip.file("brochure_en.pdf", await renderBrochure(p, "en"));
  zip.file("factsheet_el.pdf", await renderFactsheet(p, "el"));
  zip.file(
    "README.txt",
    [
      `Πακέτο αγγελίας ${p.reference}`,
      `Δημιουργήθηκε: ${formatDate(new Date(), "el")}`,
      "",
      `photos/        ${count} εγκεκριμένες φωτογραφίες (πλήρης ανάλυση, χωρίς μεταδεδομένα)`,
      "texts/         εγκεκριμένα κείμενα σε ελληνικά/αγγλικά και βασικά στοιχεία",
      "brochure_*.pdf φυλλάδιο παρουσίασης",
      "factsheet_el.pdf φύλλο στοιχείων",
      "",
      "Σημαντικό: οι φωτογραφίες με '_digitally-staged' είναι ψηφιακά επιπλωμένες. Επισημάνετέ τες ως",
      "«Ψηφιακή επίπλωση / Digitally staged» σε κάθε πλατφόρμα όπου τις δημοσιεύετε.",
    ].join("\n"),
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 3 } });
}
