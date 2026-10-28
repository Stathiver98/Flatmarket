// A deterministic safety net for generated (or pasted) listing text: flags
// claims that commonly appear in property ads but are NOT supported by the
// facts the user provided. It cannot prove text is correct; it highlights
// phrases the user should double-check before approving.

type ClaimRule = {
  id: string;
  label: string;
  // Matches in the generated text (Greek and English).
  pattern: RegExp;
  // If the user-provided facts contain any of these, the claim is supported.
  supportedBy: RegExp;
};

const RULES: ClaimRule[] = [
  { id: "view", label: "θέα", pattern: /(?<!\p{L})θέα|(?<!\p{L})θεα(?!\p{L})|\bviews?\b|πανοραμικ|panoramic/iu, supportedBy: /θέα|view|πανοραμ/i },
  { id: "sea", label: "θάλασσα", pattern: /θάλασσ|θαλασσ|\bsea\b|seaside|παραλία|beach/i, supportedBy: /θάλασσ|θαλασσ|sea|παραλ|beach/i },
  {
    id: "transport",
    label: "μέσα μεταφοράς",
    pattern: /μετρό|μετρο(?!\p{L})|\bmetro\b|(?<!\p{L})τραμ(?!\p{L})|\btram\b|λεωφορεί|\bbus\b|σταθμ|station/iu,
    supportedBy: /μετρό|μετρο|metro|τραμ|tram|λεωφορ|bus|σταθμ|station/i,
  },
  {
    id: "distance",
    label: "αποστάσεις / χρόνοι",
    pattern: /\d+\s*(λεπτ|min\b|minutes|χλμ|km\b|μέτρα|meters|metres)|απόσταση|walking distance|κοντά σε|close to|near(by)?\b|δίπλα σε/i,
    supportedBy: /λεπτ|χλμ|km|μέτρα|απόσταση|κοντά|close|near|δίπλα/i,
  },
  { id: "pool", label: "πισίνα", pattern: /πισίν|\bpool\b/i, supportedBy: /πισίν|pool/i },
  { id: "garden", label: "κήπος", pattern: /κήπο|κηπο|garden/i, supportedBy: /κήπο|κηπο|garden/i },
  { id: "renovated", label: "ανακαίνιση", pattern: /ανακαιν|renovat|refurbish/i, supportedBy: /ανακαίνιση: ναι|τι ανακαινίστηκε|renovated: yes/i },
  {
    id: "investment",
    label: "απόδοση επένδυσης",
    pattern: /(?<!ενεργειακής\s)(?<!energy\s)απόδοσ|επένδυσ|υπεραξ|\byield\b|return on|investment|ROI\b|golden visa/i,
    supportedBy: /απόδοσ|επένδυσ|yield|investment|golden visa/i,
  },
  {
    id: "legal",
    label: "νομική κατάσταση",
    pattern: /νόμιμ|τακτοποιημέν|αυθαίρετ|οικοδομική άδεια|building permit|legali[sz]ed|title deed|clear title/i,
    supportedBy: /νόμιμ|τακτοποι|αυθαίρετ|άδεια|permit|title/i,
  },
  {
    id: "quiet",
    label: "ησυχία / γειτονιά",
    pattern: /ήσυχ|ησυχ|\bquiet\b|peaceful|ασφαλή γειτονιά|safe neighbou?rhood|ζητούμενη περιοχή|sought-after/i,
    supportedBy: /ήσυχ|ησυχ|quiet|peaceful|ασφαλ|safe|ζητούμεν|sought/i,
  },
  {
    id: "superlative",
    label: "υπερθετικές εκφράσεις",
    pattern: /μοναδικ|ευκαιρία|εκπληκτικ|ονειρεμέν|απίστευτ|unique opportunity|stunning|breathtaking|must[- ]see|dream home|luxur/i,
    supportedBy: /^\b$/, // never "supported": always worth a second look
  },
];

export type ClaimWarning = { id: string; label: string; excerpt: string };

/**
 * `factsText` must contain only facts the user CONFIRMED (and their notes) —
 * never the list of unknown facts, which mentions words like "θέα".
 */
export function findUnsupportedClaims(generated: string, factsText: string): ClaimWarning[] {
  const out: ClaimWarning[] = [];
  for (const rule of RULES) {
    const m = generated.match(rule.pattern);
    if (!m || m.index === undefined) continue;
    if (rule.supportedBy.test(factsText)) continue;
    const start = Math.max(0, m.index - 30);
    const end = Math.min(generated.length, m.index + m[0].length + 30);
    out.push({
      id: rule.id,
      label: rule.label,
      excerpt: (start > 0 ? "…" : "") + generated.slice(start, end).replace(/\s+/g, " ").trim() + (end < generated.length ? "…" : ""),
    });
  }
  return out;
}
