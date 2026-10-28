import "server-only";
import { env, isClaidConfigured } from "@/server/env";
import { basicCorrection } from "./process";

// Photo processing providers. Standard enhancement must only adjust light,
// colour, clarity (and, where a provider supports it, perspective). It must not
// remove defects, alter structure, invent views or add objects.
//
// Virtual staging is deliberately NOT implemented as an automatic provider:
// we could not verify an API whose commercial terms and output fidelity we can
// stand behind. Staged images are uploaded manually (e.g. from a staging
// designer) and are always labelled "Digitally staged / Ψηφιακή επίπλωση".

export type EnhancementResult = { data: Buffer; mime: string; meta: Record<string, unknown> };

export interface EnhancementProvider {
  id: string;
  name: string;
  description: string;
  isConfigured(): boolean;
  enhance(original: Buffer): Promise<EnhancementResult>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean,
  ) {
    super(message);
  }
}

const localBasic: EnhancementProvider = {
  id: "local-basic",
  name: "Βασική διόρθωση (ενσωματωμένη)",
  description:
    "Διορθώνει φωτεινότητα, αντίθεση, ισορροπία λευκού και ευκρίνεια. Δεν αλλάζει το περιεχόμενο της φωτογραφίας και δεν διορθώνει την προοπτική.",
  isConfigured: () => true,
  async enhance(original) {
    const data = await basicCorrection(original);
    return { data, mime: "image/jpeg", meta: { operations: ["white_balance", "normalise_1_99", "saturation_1.05", "sharpen_0.7"] } };
  },
};

// Claid.ai image editing API (https://docs.claid.ai). We use only
// non-generative operations: decompression cleanup and HDR light correction.
// NOTE: implemented from Claid's published API reference; it has not been
// exercised against the live API in this repository because no key was available.
const claid: EnhancementProvider = {
  id: "claid",
  name: "Claid.ai — επαγγελματική διόρθωση φωτισμού",
  description:
    "Διόρθωση φωτισμού τύπου HDR και καθαρισμός συμπίεσης μέσω Claid.ai. Η φωτογραφία αποστέλλεται στην Claid για επεξεργασία.",
  isConfigured: isClaidConfigured,
  async enhance(original) {
    const operations = {
      restorations: { decompress: "auto" },
      adjustments: { hdr: env.claidHdrIntensity },
    };
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(original)], { type: "image/jpeg" }), "photo.jpg");
    form.append("data", JSON.stringify({ operations, output: { format: { type: "jpeg", quality: 92 } } }));

    const res = await fetch("https://api.claid.ai/v1/image/edit/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.claidApiKey}` },
      body: form,
      signal: AbortSignal.timeout(90_000),
    }).catch(() => {
      throw new ProviderError("Δεν ήταν δυνατή η σύνδεση με την υπηρεσία Claid.", "network", true);
    });
    if (res.status === 401 || res.status === 403) {
      throw new ProviderError("Το κλειδί Claid δεν είναι έγκυρο ή δεν έχει δικαιώματα.", "auth", false);
    }
    if (res.status === 402) throw new ProviderError("Δεν υπάρχουν διαθέσιμα credits στον λογαριασμό Claid.", "credits", false);
    if (res.status === 429) throw new ProviderError("Η υπηρεσία Claid δέχεται πολλά αιτήματα. Δοκιμάστε ξανά σε λίγο.", "rate_limited", true);
    if (!res.ok) throw new ProviderError(`Η υπηρεσία Claid απάντησε με σφάλμα (${res.status}).`, `http_${res.status}`, res.status >= 500);

    const json = (await res.json()) as { data?: { output?: { tmp_url?: string } } };
    const outUrl = json.data?.output?.tmp_url;
    if (!outUrl) throw new ProviderError("Η υπηρεσία Claid δεν επέστρεψε εικόνα.", "no_output", true);
    const img = await fetch(outUrl, { signal: AbortSignal.timeout(60_000) });
    if (!img.ok) throw new ProviderError("Δεν ήταν δυνατή η λήψη της επεξεργασμένης εικόνας.", "download", true);
    return { data: Buffer.from(await img.arrayBuffer()), mime: "image/jpeg", meta: { operations } };
  },
};

export const ENHANCEMENT_PROVIDERS: EnhancementProvider[] = [localBasic, claid];

export function getEnhancementProvider(id: string) {
  return ENHANCEMENT_PROVIDERS.find((p) => p.id === id) ?? null;
}

export function providerSummaries() {
  return ENHANCEMENT_PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    configured: p.isConfigured(),
  }));
}

export const PROVIDER_LABELS: Record<string, string> = {
  "local-basic": "Βασική διόρθωση",
  claid: "Claid.ai",
  "manual-upload": "Μεταφόρτωση χρήστη",
};
