/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> renders into the PDF and has no alt attribute */
import "server-only";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Presentation } from "@/lib/listing/presentation";
import {
  coverPhoto,
  keyFacts,
  missingInformation,
  presentationTitle,
  priceText,
  roomLabel,
  structuredFeatures,
} from "@/lib/listing/presentation";
import { formatDate } from "@/lib/listing/format";
import { loadFloorPlanImages, loadLogo, loadPdfImages } from "./images";

// PDF generation with embedded OFL fonts that cover Greek (see src/fonts).
const FONT_DIR = path.join(process.cwd(), "src", "fonts");
// react-pdf caches glyph data per font-family NAME across documents in the
// same process: after a Greek document, Latin letters that share glyphs with
// Greek ones (A/Α, T/Τ, o/ο…) disappear from the next PDF. We therefore
// register the fonts under a unique family name for every document, remove
// them afterwards (no memory growth), and render one PDF at a time.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

let renderSeq = 0;
type Fonts = { sans: string; display: string };

async function withFonts<T>(fn: (f: Fonts) => Promise<T>): Promise<T> {
  const n = ++renderSeq;
  const f: Fonts = { sans: `Commissioner-${n}`, display: `NotoSerifDisplay-${n}` };
  Font.register({
    family: f.sans,
    fonts: [
      { src: path.join(FONT_DIR, "Commissioner_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "Commissioner_500Medium.ttf"), fontWeight: 500 },
      { src: path.join(FONT_DIR, "Commissioner_600SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: f.display,
    fonts: [
      { src: path.join(FONT_DIR, "NotoSerifDisplay_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "NotoSerifDisplay_500Medium.ttf"), fontWeight: 500 },
    ],
  });
  // Default hyphenation is English-only and splits Greek words badly.
  Font.registerHyphenationCallback((word) => [word]);
  try {
    return await fn(f);
  } finally {
    const registry = Font.getRegisteredFonts() as Record<string, unknown>;
    delete registry[f.sans];
    delete registry[f.display];
  }
}

const C = {
  ink: "#1d1b18",
  soft: "#4f4a43",
  muted: "#7a7268",
  stone: "#e4dccf",
  paper: "#fffdf9",
  cream: "#f6f1e9",
  accent: "#9b4224",
  amber: "#8a5a12",
};

function makeStyles(f: Fonts) {
  return StyleSheet.create({
    page: {
      fontFamily: f.sans,
      fontSize: 10,
      color: C.ink,
      backgroundColor: C.paper,
      paddingTop: 36,
      paddingBottom: 56,
      paddingHorizontal: 40,
    },
    coverPage: { fontFamily: f.sans, fontSize: 10, color: C.ink, backgroundColor: C.paper, paddingBottom: 56 },
    display: { fontFamily: f.display },
    h1: { fontFamily: f.display, fontSize: 26, lineHeight: 1.15 },
    h2: { fontFamily: f.display, fontSize: 16, marginBottom: 8 },
    eyebrow: { fontSize: 8, letterSpacing: 1.4, color: C.accent, textTransform: "uppercase", fontWeight: 600 },
    body: { fontSize: 10, lineHeight: 1.55, color: C.soft },
    footer: {
      position: "absolute",
      bottom: 22,
      left: 40,
      right: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 7.5,
      color: C.muted,
      borderTopWidth: 0.5,
      borderTopColor: C.stone,
      paddingTop: 6,
    },
    chip: {
      borderWidth: 0.7,
      borderColor: C.stone,
      borderRadius: 10,
      paddingVertical: 3,
      paddingHorizontal: 8,
      marginRight: 5,
      marginBottom: 5,
      fontSize: 9,
    },
    factRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 0.5,
      borderBottomColor: C.stone,
      paddingVertical: 4,
    },
    stagedTag: {
      position: "absolute",
      left: 6,
      bottom: 6,
      backgroundColor: C.ink,
      color: C.paper,
      fontSize: 7,
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
  });
}
type Styles = ReturnType<typeof makeStyles>;

const L = {
  el: {
    reference: "Κωδικός",
    generated: "Δημιουργήθηκε",
    description: "Περιγραφή",
    features: "Βασικά χαρακτηριστικά",
    facts: "Στοιχεία ακινήτου",
    photos: "Φωτογραφίες",
    plan: "Κάτοψη",
    contact: "Επικοινωνία",
    missing: "Στοιχεία που δεν έχουν δηλωθεί",
    staged: "Ψηφιακή επίπλωση",
    stagedNote:
      "Οι φωτογραφίες με την ένδειξη «Ψηφιακή επίπλωση» έχουν επεξεργαστεί ψηφιακά· τα έπιπλα και η διακόσμηση ενδέχεται να μην υπάρχουν στο ακίνητο.",
    disclaimer:
      "Οι πληροφορίες παρέχονται από τον υπεύθυνο της αγγελίας και δεν αποτελούν προσφορά ή εγγύηση. Το Flatmarket δεν ενεργεί ως μεσίτης.",
    page: "Σελίδα",
    factsheet: "Φύλλο στοιχείων",
    noDescription: "Δεν έχει εγκριθεί ακόμη περιγραφή για αυτή την αγγελία.",
  },
  en: {
    reference: "Reference",
    generated: "Generated",
    description: "Description",
    features: "Key features",
    facts: "Property details",
    photos: "Photos",
    plan: "Floor plan",
    contact: "Contact",
    missing: "Information not provided",
    staged: "Digitally staged",
    stagedNote:
      "Photos labelled “Digitally staged” have been digitally edited; furniture and decoration may not exist in the property.",
    disclaimer:
      "Information is provided by the person responsible for this listing and does not constitute an offer or guarantee. Flatmarket does not act as an estate agent.",
    page: "Page",
    factsheet: "Fact sheet",
    noDescription: "No description has been approved for this listing yet.",
  },
};

function Footer({ p, lang, s }: { p: Presentation; lang: "el" | "en"; s: Styles }) {
  const t = L[lang];
  return (
    <View style={s.footer} fixed>
      <Text>
        {t.reference} {p.reference} · {t.generated} {formatDate(new Date(), lang)}
        {p.branding ? ` · ${p.branding.displayName}` : ""}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${t.page} ${pageNumber}/${totalPages}`} />
    </View>
  );
}

function ContactBlock({ p, lang, logo, s }: { p: Presentation; lang: "el" | "en"; logo: Buffer | null; s: Styles }) {
  const t = L[lang];
  const lines = [
    p.contact.name,
    p.branding && p.branding.displayName !== p.contact.name ? p.branding.displayName : null,
    p.contact.phone,
    p.contact.email,
    p.branding?.website,
    p.branding?.registryNumber,
  ].filter(Boolean) as string[];
  if (lines.length === 0) return null;
  return (
    <View
      style={{
        marginTop: 18,
        padding: 14,
        backgroundColor: C.cream,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
      }}
      wrap={false}
    >
      {logo && <Image src={{ data: logo, format: "png" }} style={{ height: 36, marginRight: 14, objectFit: "contain" }} />}
      <View>
        <Text style={[s.eyebrow, { marginBottom: 4 }]}>{t.contact}</Text>
        {lines.map((l, i) => (
          <Text
            key={i}
            style={{
              fontSize: i === 0 ? 11 : 9.5,
              fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? C.ink : C.soft,
              marginBottom: 1.5,
            }}
          >
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

function FactsTable({ p, lang, s }: { p: Presentation; lang: "el" | "en"; s: Styles }) {
  const rows = keyFacts(p, lang);
  return (
    <View>
      {rows.map((r) => (
        <View key={r.label} style={s.factRow} wrap={false}>
          <Text style={{ color: C.muted }}>{r.label}</Text>
          <Text style={{ fontWeight: 500, maxWidth: "60%", textAlign: "right" }}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function renderBrochure(p: Presentation, lang: "el" | "en"): Promise<Buffer> {
  return exclusive(() => withFonts((f) => renderBrochureNow(p, lang, f)));
}

export function renderFactsheet(p: Presentation, lang: "el" | "en"): Promise<Buffer> {
  return exclusive(() => withFonts((f) => renderFactsheetNow(p, lang, f)));
}

async function renderBrochureNow(p: Presentation, lang: "el" | "en", f: Fonts): Promise<Buffer> {
  const s = makeStyles(f);
  const t = L[lang];
  const content = p.content[lang].description || p.content[lang].headline ? p.content[lang] : p.content.el;
  const title = presentationTitle(p, lang);
  const cover = coverPhoto(p);
  const images = await loadPdfImages(p, 13);
  const coverImg = images.find((i) => i.photo.id === cover?.id) ?? images[0];
  const rest = images.filter((i) => i !== coverImg).slice(0, 12);
  const plans = await loadFloorPlanImages(p);
  const logo = p.branding?.hasLogo ? await loadLogo(p.branding.workspaceId) : null;
  const features = [...content.features, ...structuredFeatures(p, lang).filter((f) => !content.features.includes(f))];
  const missing = missingInformation(p, lang);
  const anyStaged = images.some((i) => i.photo.kind === "STAGED");
  const quick = keyFacts(p, lang).slice(0, 6);

  const doc = (
    <Document
      title={title}
      author={p.branding?.displayName ?? "Flatmarket"}
      creator="Flatmarket"
      language={lang === "el" ? "el-GR" : "en-GB"}
    >
      <Page size="A4" style={s.coverPage}>
        {coverImg ? (
          <View style={{ height: 430, position: "relative" }}>
            <Image src={{ data: coverImg.data, format: "jpg" }} style={{ width: "100%", height: 430, objectFit: "cover" }} />
            {coverImg.photo.kind === "STAGED" && <Text style={s.stagedTag}>{t.staged}</Text>}
          </View>
        ) : (
          <View style={{ height: 120, backgroundColor: C.cream }} />
        )}
        <View style={{ paddingHorizontal: 40, paddingTop: 26 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            {p.location ? <Text style={s.eyebrow}>{p.location}</Text> : <Text> </Text>}
            {logo ? (
              <Image src={{ data: logo, format: "png" }} style={{ height: 28, objectFit: "contain" }} />
            ) : p.branding ? (
              <Text style={{ fontSize: 9, fontWeight: 600 }}>{p.branding.displayName}</Text>
            ) : null}
          </View>
          <Text style={s.h1}>{title}</Text>
          <Text style={[s.display, { fontSize: 18, marginTop: 10, color: C.accent }]}>{priceText(p, lang)}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 14 }}>
            {quick.map((q) => (
              <Text key={q.label} style={s.chip}>
                {q.label}: {q.value}
              </Text>
            ))}
          </View>
          {content.summary && <Text style={[s.body, { marginTop: 12, fontSize: 11, color: C.ink }]}>{content.summary}</Text>}
        </View>
        <Footer p={p} lang={lang} s={s} />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.h2}>{t.description}</Text>
        {content.description ? (
          content.description.split(/\n{2,}/).map((para, i) => (
            <Text key={i} style={[s.body, { marginBottom: 7 }]}>
              {para}
            </Text>
          ))
        ) : (
          <Text style={s.body}>{t.noDescription}</Text>
        )}
        {features.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.h2}>{t.features}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {features.map((f) => (
                <Text key={f} style={{ width: "50%", fontSize: 9.5, color: C.soft, marginBottom: 4 }}>
                  • {f}
                </Text>
              ))}
            </View>
          </View>
        )}
        <View style={{ marginTop: 14 }}>
          <Text style={s.h2}>{t.facts}</Text>
          <FactsTable p={p} lang={lang} s={s} />
        </View>
        {missing.length > 0 && (
          <Text style={{ marginTop: 10, fontSize: 8.5, color: C.muted }}>
            {t.missing}: {missing.join(", ")}
          </Text>
        )}
        <ContactBlock p={p} lang={lang} logo={logo} s={s} />
        <Footer p={p} lang={lang} s={s} />
      </Page>

      {rest.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.h2}>{t.photos}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {rest.map((img) => (
              <View key={img.photo.id} style={{ width: "48.5%", marginBottom: 10 }} wrap={false}>
                <View style={{ position: "relative" }}>
                  <Image
                    src={{ data: img.data, format: "jpg" }}
                    style={{ width: "100%", height: 170, objectFit: "cover", borderRadius: 4 }}
                  />
                  {img.photo.kind === "STAGED" && <Text style={s.stagedTag}>{t.staged}</Text>}
                </View>
                <Text style={{ fontSize: 8, color: C.muted, marginTop: 3 }}>
                  {roomLabel(img.photo.room, img.photo.roomLabel, lang)}
                  {img.photo.caption ? ` — ${img.photo.caption}` : ""}
                </Text>
              </View>
            ))}
          </View>
          {anyStaged && <Text style={{ fontSize: 8, color: C.amber, marginTop: 6 }}>{t.stagedNote}</Text>}
          <Footer p={p} lang={lang} s={s} />
        </Page>
      )}

      {plans.map((pl) => (
        <Page key={pl.id} size="A4" style={s.page}>
          <Text style={s.h2}>
            {t.plan}
            {pl.label ? ` — ${pl.label}` : ""}
          </Text>
          <Image src={{ data: pl.data, format: "jpg" }} style={{ width: "100%", maxHeight: 640, objectFit: "contain" }} />
          {pl.hotspots.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
              {pl.hotspots.map((h, i) => (
                <Text key={i} style={s.chip}>
                  {i + 1}. {roomLabel(h.room, h.roomLabel, lang)}
                </Text>
              ))}
            </View>
          )}
          <Footer p={p} lang={lang} s={s} />
        </Page>
      ))}

      <Page size="A4" style={s.page}>
        <ContactBlock p={p} lang={lang} logo={logo} s={s} />
        <Text style={{ marginTop: 18, fontSize: 8, color: C.muted, lineHeight: 1.5 }}>{t.disclaimer}</Text>
        {anyStaged && <Text style={{ marginTop: 6, fontSize: 8, color: C.amber }}>{t.stagedNote}</Text>}
        <Footer p={p} lang={lang} s={s} />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

async function renderFactsheetNow(p: Presentation, lang: "el" | "en", f: Fonts): Promise<Buffer> {
  const s = makeStyles(f);
  const t = L[lang];
  const title = presentationTitle(p, lang);
  const cover = coverPhoto(p);
  const images = cover ? await loadPdfImages({ ...p, photos: [cover] }, 1) : [];
  const logo = p.branding?.hasLogo ? await loadLogo(p.branding.workspaceId) : null;
  const missing = missingInformation(p, lang);
  const doc = (
    <Document title={`${t.factsheet} — ${title}`} creator="Flatmarket" language={lang === "el" ? "el-GR" : "en-GB"}>
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>{t.factsheet}</Text>
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          <View style={{ flex: 1, paddingRight: 14 }}>
            <Text style={[s.h1, { fontSize: 20 }]}>{title}</Text>
            {p.location && <Text style={{ marginTop: 6, color: C.muted }}>{p.location}</Text>}
            <Text style={[s.display, { fontSize: 16, marginTop: 8, color: C.accent }]}>{priceText(p, lang)}</Text>
          </View>
          {images[0] && (
            <View style={{ width: 190, position: "relative" }}>
              <Image
                src={{ data: images[0].data, format: "jpg" }}
                style={{ width: 190, height: 130, objectFit: "cover", borderRadius: 4 }}
              />
              {images[0].photo.kind === "STAGED" && <Text style={s.stagedTag}>{t.staged}</Text>}
            </View>
          )}
        </View>
        <View style={{ marginTop: 18 }}>
          <Text style={s.h2}>{t.facts}</Text>
          <FactsTable p={p} lang={lang} s={s} />
        </View>
        {missing.length > 0 && (
          <Text style={{ marginTop: 10, fontSize: 9, color: C.soft }}>
            {t.missing}: {missing.join(", ")}
          </Text>
        )}
        <ContactBlock p={p} lang={lang} logo={logo} s={s} />
        <Text style={{ marginTop: 14, fontSize: 7.5, color: C.muted }}>{t.disclaimer}</Text>
        <Footer p={p} lang={lang} s={s} />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
