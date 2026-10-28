import { test, expect, type Page, type Browser } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const FIX = path.join(__dirname, ".tmp");
const PASSWORD = "e2e-password-123";
const stamp = Date.now();
const owner = { name: "Ιδιοκτήτης Δοκιμής", email: `owner-${stamp}@example.test` };
const other = { name: "Άλλος Χρήστης", email: `other-${stamp}@example.test` };

let listingId = "";
let shareUrl = "";
let firstPhotoId = "";

async function signup(page: Page, u: { name: string; email: string }) {
  await page.goto("/signup");
  await page.fill("#name", u.name);
  await page.fill("#email", u.email);
  await page.fill("#password", PASSWORD);
  await page.locator('input[name="terms"]').check();
  await page.getByRole("button", { name: "Δημιουργία λογαριασμού" }).click();
  await page.waitForURL(/\/app/);
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Σύνδεση" }).click();
  await page.waitForURL(/\/app/);
}

function hasPdftotext() {
  try {
    execSync("pdftotext -v", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function completenessScore(page: Page) {
  const text = await page.getByText(/Πληρότητα \d+%/).first().textContent();
  return Number(text!.match(/(\d+)%/)![1]);
}

async function anonymousPage(browser: Browser, width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  return ctx.newPage();
}

test.describe.serial("real listing workflow", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test("sign up and create a draft listing", async () => {
    await signup(page, owner);
    await expect(page.getByText("Καλώς ήρθατε στο Flatmarket")).toBeVisible();
    await page.getByRole("button", { name: "+ Νέα αγγελία" }).click();
    await page.waitForURL(/\/app\/listings\/[^/]+\/basics/);
    listingId = page.url().split("/listings/")[1].split("/")[0];
    expect(listingId).toBeTruthy();
  });

  test("basics are validated, saved and persist after refresh", async () => {
    const scoreBefore = await completenessScore(page);
    // Invalid postal code is rejected with a clear message and nothing is lost.
    await page.fill("#postalCode", "12");
    await page.getByRole("button", { name: "Αποθήκευση πρόχειρου" }).click();
    await expect(page.getByText("Ο ταχυδρομικός κώδικας έχει 5 ψηφία.")).toBeVisible();

    await page.locator('label:has(input[name="purpose"][value="SALE"])').click();
    await page.locator('label:has(input[name="propertyType"][value="APARTMENT"])').click();
    await page.fill("#region", "Αττική");
    await page.fill("#municipality", "Δήμος Αθηναίων");
    await page.fill("#neighborhood", "Παγκράτι");
    await page.fill("#address", "Οδός Ιδιωτική 99");
    await page.fill("#postalCode", "11635");
    await page.fill("#price", "195.000");
    await page.fill("#areaSqm", "82,5");
    await page.selectOption("#floor", "3");
    await page.fill("#bedrooms", "2");
    await page.fill("#bathrooms", "1");
    await page.selectOption("#availability", "IMMEDIATE");
    await page.getByRole("button", { name: "Αποθήκευση & συνέχεια" }).click();
    await page.waitForURL(/\/details$/);

    await page.goto(`/app/listings/${listingId}/basics`);
    await expect(page.locator("#price")).toHaveValue("195000");
    await expect(page.locator("#areaSqm")).toHaveValue("82.5");
    await expect(page.locator("#address")).toHaveValue("Οδός Ιδιωτική 99");
    expect(await completenessScore(page)).toBeGreaterThan(scoreBefore);
  });

  test("characteristics allow 'unknown' and persist", async () => {
    await page.goto(`/app/listings/${listingId}/details`);
    await page.selectOption("#heating", "AUTONOMOUS_GAS");
    await page.selectOption("#energyClass", "UNKNOWN");
    await page.locator('label:has(input[name="elevator"][value="YES"])').click();
    await page.fill("#limitations", "Το μπάνιο χρειάζεται ανανέωση.");
    await page.getByRole("button", { name: "Αποθήκευση πρόχειρου" }).click();
    await expect(page.getByText("Τα χαρακτηριστικά αποθηκεύτηκαν.")).toBeVisible();
    await page.reload();
    await expect(page.locator("#heating")).toHaveValue("AUTONOMOUS_GAS");
    await expect(page.locator("#energyClass")).toHaveValue("UNKNOWN");
    await expect(page.locator("#limitations")).toHaveValue("Το μπάνιο χρειάζεται ανανέωση.");
  });

  test("photos: upload many, reject invalid, assign rooms, reorder, cover", async () => {
    await page.goto(`/app/listings/${listingId}/photos`);
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles([1, 2, 3, 4, 5, 6].map((i) => path.join(FIX, `room-${i}.jpg`)));
    const cards = page.locator("ul li:has(select)");
    await expect(cards).toHaveCount(6, { timeout: 60_000 });

    await input.setInputFiles(path.join(FIX, "not-an-image.jpg"));
    await expect(page.getByText(/δεν αναγνωρίζεται ως εικόνα/)).toBeVisible();
    await expect(cards).toHaveCount(6);

    const rooms = ["LIVING_ROOM", "KITCHEN", "BEDROOM", "BEDROOM", "BATHROOM", "BALCONY"];
    for (const [i, room] of rooms.entries()) {
      await cards.nth(i).locator("select").selectOption(room);
    }
    const srcBefore = await cards.nth(0).locator("img").getAttribute("src");
    firstPhotoId = srcBefore!.split("/api/files/photos/")[1].split("?")[0];
    await cards.nth(0).getByRole("button", { name: "Μετακίνηση αργότερα" }).click();
    await expect(page.getByText("Όλες οι αλλαγές αποθηκεύτηκαν")).toBeVisible();
    await page.reload();
    await expect(cards.nth(1).locator("img")).toHaveAttribute("src", srcBefore!);
    await expect(cards.nth(1).locator("select")).toHaveValue("LIVING_ROOM");

    // The first upload became the cover automatically; choose another one.
    await expect(cards.nth(1).getByText("Εξώφυλλο")).toBeVisible();
    await cards.nth(0).getByRole("button", { name: "Ορισμός εξωφύλλου" }).click();
    await expect(cards.nth(0).getByText("Εξώφυλλο")).toBeVisible();
    await expect(page.getByText("Όλες οι αλλαγές αποθηκεύτηκαν")).toBeVisible();
    await page.reload();
    await expect(cards.nth(0).getByText("Εξώφυλλο")).toBeVisible();
    await expect(cards.nth(1).getByText("Εξώφυλλο")).toHaveCount(0);
  });

  test("basic photo correction creates a separate version and keeps the original", async () => {
    const cards = page.locator("ul li:has(select)");
    await cards.nth(0).getByRole("button", { name: /Εκδόσεις/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Δημιουργία βελτιωμένης έκδοσης" }).first().click();
    await expect(dialog.getByText(/Η βελτιωμένη έκδοση είναι έτοιμη/)).toBeVisible({ timeout: 60_000 });
    await expect(dialog.getByAltText("Πρωτότυπη φωτογραφία")).toBeVisible();
    await expect(dialog.getByText("Δεν έχει ρυθμιστεί").first()).toBeVisible(); // Claid without key
    await dialog.getByRole("button", { name: "Χρήση αυτής της έκδοσης" }).click();
    await expect(dialog.getByText("Χρησιμοποιείται")).toBeVisible();
    await dialog.getByRole("button", { name: "Κλείσιμο" }).click();
    await expect(cards.nth(0).getByText("Βελτιωμένη")).toBeVisible();
  });

  test("manual content works without an AI provider", async () => {
    await page.goto(`/app/listings/${listingId}/content`);
    await expect(page.getByText("Η αυτόματη δημιουργία κειμένων δεν έχει ρυθμιστεί")).toBeVisible();
    const headline = page.locator("form:has(#t-headline-el)");
    await page.fill("#t-headline-el", "Φωτεινό διαμέρισμα 82,5 m² στο Παγκράτι");
    await headline.getByRole("button", { name: "Αποθήκευση & έγκριση" }).click();
    await expect(headline.getByText("εγκρίθηκε")).toBeVisible();
    const desc = page.locator("form:has(#t-description-el)");
    await page.fill("#t-description-el", "Διαμέρισμα δύο υπνοδωματίων στον 3ο όροφο με ανελκυστήρα.\n\nΤο μπάνιο χρειάζεται ανανέωση.");
    await desc.getByRole("button", { name: "Αποθήκευση & έγκριση" }).click();
    await expect(desc.getByText("εγκρίθηκε")).toBeVisible();
    // A text with an unsupported claim is flagged before approval.
    const social = page.locator("form:has(#t-social-el)");
    await page.fill("#t-social-el", "Μοναδική ευκαιρία με θέα, 2 λεπτά από το μετρό!");
    await social.getByRole("button", { name: "Αποθήκευση πρόχειρου" }).click();
    await expect(social.getByText("Ελέγξτε αυτές τις φράσεις πριν την έγκριση")).toBeVisible();
    await page.reload();
    await expect(page.locator("#t-headline-el")).toHaveValue("Φωτεινό διαμέρισμα 82,5 m² στο Παγκράτι");
  });

  test("preview shows approved content only and hides the private address", async () => {
    await page.goto(`/preview/${listingId}`);
    await expect(page.getByText("Προεπισκόπηση — η σελίδα δεν είναι δημόσια")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Φωτεινό διαμέρισμα 82,5 m² στο Παγκράτι");
    await expect(page.getByText("Οδός Ιδιωτική 99")).toHaveCount(0);
    await expect(page.getByText("Μοναδική ευκαιρία")).toHaveCount(0); // unapproved social caption
    await expect(page.getByText("Στοιχεία που δεν έχουν δηλωθεί")).toBeVisible();
  });

  test("publication requires explicit approval", async () => {
    await page.goto(`/app/listings/${listingId}/share`);
    await expect(page.getByText("Η αγγελία δεν έχει εγκριθεί")).toBeVisible();
    await expect(page.getByRole("button", { name: "Δημοσίευση αγγελίας" })).toHaveCount(0);

    await page.goto(`/app/listings/${listingId}/review`);
    await page.getByRole("button", { name: "Έγκριση αγγελίας" }).click();
    await expect(page.getByText(/Επιβεβαιώστε ότι έχετε ελέγξει/)).toBeVisible();
    await page.locator('input[name="confirmFacts"]').check();
    await page.getByRole("button", { name: "Έγκριση αγγελίας" }).click();
    await expect(page.getByText("Η αγγελία εγκρίθηκε. Μπορείτε τώρα να τη δημοσιεύσετε.")).toBeVisible();

    await page.goto(`/app/listings/${listingId}/share`);
    await page.getByRole("button", { name: "Δημοσίευση αγγελίας" }).click();
    await expect(page.getByText("Η σελίδα είναι διαθέσιμη μόνο με τον σύνδεσμο.")).toBeVisible();
    await page.reload();
    shareUrl = await page.getByLabel("Σύνδεσμος κοινοποίησης").inputValue();
    expect(shareUrl).toMatch(/\/s\/[A-Za-z0-9_-]{20,}$/);
  });

  test("visitors see the shared page (desktop and mobile) and can send an enquiry", async ({ browser }) => {
    const anon = await anonymousPage(browser);
    await anon.goto(shareUrl);
    await expect(anon.getByRole("heading", { level: 1 })).toHaveText("Φωτεινό διαμέρισμα 82,5 m² στο Παγκράτι");
    await expect(anon.getByText("195.000 €").first()).toBeVisible();
    await expect(anon.getByText("Οδός Ιδιωτική 99")).toHaveCount(0);
    const robots = await anon.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toContain("noindex");

    // Public images never carry the original camera metadata.
    const imgSrc = await anon.locator('img[src*="/api/public/"]').first().getAttribute("src");
    const img = await anon.request.get(imgSrc!);
    expect(img.status()).toBe(200);
    expect((await img.body()).includes(Buffer.from("E2E-TEST-SECRET-EXIF"))).toBe(false);

    await anon.waitForTimeout(3000); // form timing protection
    await anon.fill("#enq-name", "Ενδιαφερόμενος Αγοραστής");
    await anon.fill("#enq-email", "buyer@example.test");
    await anon.fill("#enq-message", "Θα ήθελα να δω το ακίνητο την επόμενη εβδομάδα.");
    await anon.locator('input[name="consent"]').check();
    await anon.getByRole("button", { name: "Αποστολή μηνύματος" }).click();
    // Email is not configured in tests: the message must say it was stored, not "sent by email".
    await expect(anon.getByText("Το μήνυμά σας καταχωρήθηκε και θα το δει ο υπεύθυνος της αγγελίας στον λογαριασμό του.")).toBeVisible();

    const mobile = await anonymousPage(browser, 390);
    await mobile.goto(shareUrl);
    await expect(mobile.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    await mobile.goto(`${shareUrl}?lang=en`);
    await expect(mobile.getByText("Property details")).toBeVisible();

    await page.goto("/app/enquiries");
    await expect(page.getByText("Θα ήθελα να δω το ακίνητο την επόμενη εβδομάδα.")).toBeVisible();
    await expect(page.getByText("Χωρίς email (δεν έχει ρυθμιστεί)")).toBeVisible();
  });

  test("exports: PDF brochure, factsheet, photos and package", async () => {
    const pdf = await page.request.get(`/api/listings/${listingId}/export/brochure?lang=el`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    const body = await pdf.body();
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    writeFileSync(path.join(FIX, "brochure_el.pdf"), body);

    const fact = await page.request.get(`/api/listings/${listingId}/export/factsheet?lang=en`);
    expect(fact.status()).toBe(200);
    writeFileSync(path.join(FIX, "factsheet_en.pdf"), await fact.body());
    // Regression: rendering a Greek PDF first used to drop Latin glyphs that
    // share shapes with Greek letters (A/Α, T/Τ, o/ο) from the next PDF.
    if (hasPdftotext()) {
      const el = execSync(`pdftotext "${path.join(FIX, "brochure_el.pdf")}" -`).toString();
      expect(el).toContain("Φωτεινό διαμέρισμα 82,5 m² στο Παγκράτι");
      expect(el).toContain("Αυτόνομη θέρμανση φυσικού αερίου");
      const en = execSync(`pdftotext "${path.join(FIX, "factsheet_en.pdf")}" -`).toString();
      expect(en).toContain("Property details");
      expect(en).toContain("Apartment");
      expect(en).toContain("Bathrooms");
    }

    const zip = await page.request.get(`/api/listings/${listingId}/export/package`);
    expect(zip.status()).toBe(200);
    expect(zip.headers()["content-type"]).toBe("application/zip");
    writeFileSync(path.join(FIX, "package.zip"), await zip.body());

    // The untouched original is preserved for the owner (metadata included).
    const original = await page.request.get(`/api/files/photos/${firstPhotoId}?s=original`);
    expect(original.status()).toBe(200);
    expect((await original.body()).includes(Buffer.from("E2E-TEST-SECRET-EXIF"))).toBe(true);
  });

  test("another user cannot access private listings or files", async ({ browser }) => {
    const ctx = await browser.newContext();
    const intruder = await ctx.newPage();
    await signup(intruder, other);
    for (const url of [`/app/listings/${listingId}`, `/app/listings/${listingId}/photos`, `/preview/${listingId}`, "/admin"]) {
      const res = await intruder.goto(url);
      expect(res?.status(), url).toBe(404);
    }
    for (const url of [
      `/api/files/photos/${firstPhotoId}?s=original`,
      `/api/files/photos/${firstPhotoId}`,
      `/api/listings/${listingId}/export/package`,
      `/api/listings/${listingId}/export/brochure`,
    ]) {
      const res = await intruder.request.get(url);
      expect(res.status(), url).toBe(404);
    }
    const upload = await intruder.request.post(`/api/listings/${listingId}/photos`, {
      headers: { origin: "http://localhost:3100" },
      multipart: { file: { name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") } },
    });
    expect(upload.status()).toBe(404);
    await expect(intruder.getByText("Φωτεινό διαμέρισμα")).toHaveCount(0);

    // Anonymous visitors cannot read private files either.
    const anonCtx = await browser.newContext();
    const anonRes = await anonCtx.request.get(`/api/files/photos/${firstPhotoId}`);
    expect(anonRes.status()).toBe(404);
  });

  test("editing a published listing does not change the live page until re-approved", async ({ browser }) => {
    await page.goto(`/app/listings/${listingId}/basics`);
    await page.fill("#price", "210000");
    await page.getByRole("button", { name: "Αποθήκευση πρόχειρου" }).click();
    await expect(page.getByText("Τα βασικά στοιχεία αποθηκεύτηκαν.")).toBeVisible();
    await page.goto(`/app/listings/${listingId}/share`);
    await expect(page.getByText("Οι αλλαγές σας χρειάζονται έγκριση")).toBeVisible();

    const anon = await anonymousPage(browser);
    await anon.goto(shareUrl);
    await expect(anon.getByText("195.000 €").first()).toBeVisible();
    await expect(anon.getByText("210.000 €")).toHaveCount(0);

    await page.goto(`/app/listings/${listingId}/review`);
    await page.locator('input[name="confirmFacts"]').check();
    await page.getByRole("button", { name: "Έγκριση αγγελίας" }).click();
    await expect(page.getByText(/Η αγγελία εγκρίθηκε/)).toBeVisible();
    await page.goto(`/app/listings/${listingId}/share`);
    await page.getByRole("button", { name: "Ενημέρωση δημοσιευμένης σελίδας" }).click();
    await expect(page.getByText("Η σελίδα είναι διαθέσιμη μόνο με τον σύνδεσμο.")).toBeVisible();
    await anon.reload();
    await expect(anon.getByText("210.000 €").first()).toBeVisible();
  });

  test("unpublishing removes the page immediately", async ({ browser }) => {
    await page.goto(`/app/listings/${listingId}/share`);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Απόσυρση αγγελίας" }).click();
    await expect(page.getByText(/Η αγγελία αποσύρθηκε/)).toBeVisible();
    await expect(page.getByText("Μη δημοσιευμένη")).toBeVisible();
    const anon = await anonymousPage(browser);
    const res = await anon.goto(shareUrl);
    expect(res?.status()).toBe(404);
  });

  test("data persists across sessions (log out and in again)", async ({ browser }) => {
    const ctx = await browser.newContext();
    const p2 = await ctx.newPage();
    await login(p2, owner.email);
    await expect(p2.getByText("Φωτεινό διαμέρισμα 82,5 m² στο Παγκράτι")).toBeVisible();
  });
});

test("contact form stores the request and is honest about email", async ({ page }) => {
  await page.goto("/contact?type=PRICING&package=showcase");
  await expect(page.locator("#packageName")).toHaveValue("showcase");
  await page.fill("#name", "Γραφείο Δοκιμής");
  await page.fill("#email", "agency@example.test");
  await page.fill("#message", "Θα θέλαμε προσφορά για 10 ακίνητα τον μήνα.");
  await page.locator('input[name="consent"]').check();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Αποστολή αιτήματος" }).click();
  await expect(page.getByText("Ευχαριστούμε. Το αίτημά σας καταχωρήθηκε στο σύστημά μας και θα το δει η ομάδα μας.")).toBeVisible();
});

test("contact form rejects submissions without consent", async ({ page }) => {
  await page.goto("/contact");
  await page.fill("#name", "Χωρίς Συγκατάθεση");
  await page.fill("#email", "x@example.test");
  await page.fill("#message", "Ένα αρκετά μεγάλο μήνυμα δοκιμής.");
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Αποστολή αιτήματος" }).click();
  await expect(page.getByText("Χρειάζεται η συγκατάθεσή σας για να επεξεργαστούμε το αίτημα.")).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("Χωρίς Συγκατάθεση"); // nothing typed is lost
});
