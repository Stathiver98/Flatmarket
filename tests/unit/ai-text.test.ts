import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFactSheet } from "@/lib/listing/ai-facts";

// Exercises the real Anthropic SDK against a local mock of the Messages API,
// so we can verify the request we send and how responses/errors are handled
// without a real API key.

type Captured = { headers: IncomingMessage["headers"]; body: Record<string, unknown> };
let server: Server;
let captured: Captured[] = [];
let respond: (body: Record<string, unknown>) => { status: number; json: unknown };

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      captured.push({ headers: req.headers, body });
      const r = respond(body);
      res.writeHead(r.status, { "content-type": "application/json", "request-id": "req_test" });
      res.end(JSON.stringify(r.json));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.AI_TEXT_MODEL = "claude-opus-5-5";
});

afterAll(() => {
  server.close();
  delete process.env.ANTHROPIC_BASE_URL;
  delete process.env.ANTHROPIC_API_KEY;
});

beforeEach(() => {
  captured = [];
  vi.resetModules();
});

const facts = buildFactSheet({
  purpose: "SALE",
  propertyType: "APARTMENT",
  title: null,
  region: "Αττική",
  municipality: "Αθήνα",
  neighborhood: "Παγκράτι",
  address: "Οδός Μυστική 12",
  postalCode: null,
  locationPrecision: "AREA",
  price: 200000,
  priceOnRequest: false,
  areaSqm: 90,
  bedrooms: 2,
  bathrooms: 1,
  floor: "3",
  availability: "IMMEDIATE",
  availableFrom: null,
  details: { limitations: "Το μπάνιο χρειάζεται ανανέωση" },
  rooms: [],
  hasFloorPlan: false,
  hasStagedPhotos: false,
});

function message(text: string, stop_reason = "end_turn") {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text }],
    stop_reason,
    stop_sequence: null,
    usage: { input_tokens: 812, output_tokens: 240 },
  };
}

describe("generateListingContent", () => {
  it("sends only confirmed facts with structured output and returns the sections", async () => {
    respond = () => ({
      status: 200,
      json: message(JSON.stringify({ headline_el: "Διαμέρισμα 90 m² στο Παγκράτι", description_el: "Περιγραφή.\n\nΤο μπάνιο χρειάζεται ανανέωση." })),
    });
    const { generateListingContent } = await import("@/server/ai/text");
    const r = await generateListingContent({
      factSheet: facts.text,
      sections: [
        { key: "headline", lang: "el" },
        { key: "description", lang: "el" },
      ],
      tone: "neutral",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sections.map((s) => s.key)).toEqual(["headline", "description"]);
    expect(r.usage).toEqual({ inputTokens: 812, outputTokens: 240 });

    const req = captured[0];
    expect(req.body.model).toBe("claude-opus-5-5");
    expect(req.body.thinking).toEqual({ type: "adaptive" });
    const oc = req.body.output_config as { effort: string; format: { type: string; schema: { properties: object } } };
    expect(oc.effort).toBe("medium");
    expect(oc.format.type).toBe("json_schema");
    expect(Object.keys(oc.format.schema.properties).sort()).toEqual(["description_el", "headline_el"]);
    expect(req.body.fallbacks).toBe("default");
    expect(String(req.headers["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect(req.headers["authorization"]).toBe("Bearer test-key");
    const payload = JSON.stringify(req.body);
    expect(payload).toContain("Παγκράτι");
    expect(payload).toContain("Το μπάνιο χρειάζεται ανανέωση");
    expect(payload).not.toContain("Οδός Μυστική"); // private address never sent
    expect(String(req.body.system)).toContain("Μην επινοείς");
  });

  it("reports a refusal honestly", async () => {
    respond = () => ({ status: 200, json: message("", "refusal") });
    const { generateListingContent } = await import("@/server/ai/text");
    const r = await generateListingContent({ factSheet: facts.text, sections: [{ key: "headline", lang: "el" }], tone: "neutral" });
    expect(r).toMatchObject({ ok: false, code: "refusal" });
  });

  it("reports malformed output as a retryable error", async () => {
    respond = () => ({ status: 200, json: message("{not json") });
    const { generateListingContent } = await import("@/server/ai/text");
    const r = await generateListingContent({ factSheet: facts.text, sections: [{ key: "headline", lang: "el" }], tone: "neutral" });
    expect(r).toMatchObject({ ok: false, code: "parse_error", retryable: true });
  });

  it("maps an invalid key to a clear, non-retryable error", async () => {
    respond = () => ({ status: 401, json: { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } } });
    const { generateListingContent } = await import("@/server/ai/text");
    const r = await generateListingContent({ factSheet: facts.text, sections: [{ key: "headline", lang: "el" }], tone: "neutral" });
    expect(r).toMatchObject({ ok: false, code: "auth", retryable: false });
  });

  it("is disabled cleanly when no key is configured", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const { generateListingContent } = await import("@/server/ai/text");
    const r = await generateListingContent({ factSheet: facts.text, sections: [{ key: "headline", lang: "el" }], tone: "neutral" });
    expect(r).toMatchObject({ ok: false, code: "not_configured" });
    expect(captured).toHaveLength(0);
    process.env.ANTHROPIC_API_KEY = saved;
  });
});
