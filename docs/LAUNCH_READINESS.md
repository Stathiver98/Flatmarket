# Launch readiness report

Date: 28 October 2026. Verdict: **the product is functionally complete for a first real listing and can be tested today, but it is
not ready for public launch** until the items in section K marked "Before launch" are done — mainly real business details, legal
review, a production deployment with backups, and tests with your real property.

## A. What works today (verified locally)

- Public website (Home, How it works, Services, For agencies, Pricing, Contact, Login/Sign-up, Privacy & Terms drafts) in Greek,
  responsive (checked at 390 px and 1440 px).
- Sign-up/login/logout, password change, password reset (email or admin-generated link), roles (user/admin), agency workspaces with
  secure team invitations.
- 8-step listing workflow with drafts saved at every step; data persists across refreshes and sessions.
- Photo upload (multi-file, progress, validation, HEIC guidance), reordering, room assignment, cover, deletion, metadata-free public
  versions, preserved originals, built-in photo correction with side-by-side comparison, manual enhanced/staged versions with labels and
  mandatory review of staged images.
- Floor plans with room markers linked to the room-by-room gallery.
- Transparent completeness indicator.
- Manual Greek/English copy with approval per section, claim checker; AI generation implemented (needs key).
- Preview, explicit approval, publish link-only/public, snapshot publishing, update, unpublish, regenerate link, archive, delete.
- Presentation page (Greek/English), enquiry form stored in the account, honest delivery status.
- PDF brochure (Greek & English), factsheet, photos ZIP, full package ZIP — Greek text verified in the generated PDFs.
- Dashboard with search/filters/actions; enquiries inbox; settings/branding/logo; admin workspace.

Automated tests: **36 unit tests** (completeness, claims, fact sheet privacy, parsing, formatting, tour links, passwords, AI request
and error handling against a mock API) and **16 end-to-end tests** covering the acceptance flow (sign-up → listing → photos →
content → preview → approval → publish → visitor enquiry → exports → access control → edit/republish → unpublish → persistence →
contact form). All pass; the E2E suite passed 3 consecutive runs.

## B. Requires an API key or third-party service

| Feature | Service | Without it |
| --- | --- | --- |
| AI listing copy | Anthropic API key | Manual writing (fully functional) |
| Professional photo enhancement | Claid.ai API key | Built-in basic correction |
| Email delivery (enquiries, invitations, password reset, contact) | Resend (verified domain) | Messages stored and visible in the app; users are told no email was sent; admin generates reset links |
| Object storage (if not using a single VPS) | Cloudflare R2 / S3 | Local disk storage |
| Automatic virtual staging | Not integrated (no provider met the fidelity/rights bar we could verify) | Manual upload of designer-staged images |

## C. Requires real business details

- Legal entity name, ΑΦΜ, ΓΕΜΗ, address, public contact email/phone → `src/config/site.ts` (shown in the footer only when filled).
- Final package names, prices, VAT treatment, hosting periods, revision rounds → `src/config/pricing.ts`.
- Sender domain/email for notifications; inbox for contact requests.
- Privacy and Terms text placeholders `[ ]`.

## D. Needs legal or accounting review

- Privacy policy and terms (drafts only), cookie statement (only an essential session cookie is used today).
- Lawful basis and retention periods for enquiries and contact requests; DPAs with Anthropic, Claid, Resend, hosting/storage.
- Consumer-law requirements for selling packages online (pre-contract information, withdrawal right), invoicing and VAT.
- Rules on property advertising in Greece (e.g. mandatory energy-class mention in ads, agent registry numbers) — the app supports
  these fields but does not enforce legal requirements.
- Wording that the platform is not a broker (present in footer, terms, presentation pages and PDFs).
- Labelling of digitally staged images (implemented; confirm wording).

## E. Must be tested with your real property

- Upload speed and reliability from your phone/connection with real (5–15 MB) photos; HEIC handling (export to JPEG).
- Photo order, rotation of portrait photos, room assignment workflow on mobile.
- Quality of the built-in correction (and Claid, if enabled) on your real photos — compare with originals.
- AI copy accuracy on your real facts (if enabled): check every sentence; check the claim warnings.
- PDF layout with real photos and long Greek descriptions; print one copy.
- Presentation page on several phones; share the link via Viber/WhatsApp/Messenger and check the preview card.
- Enquiry flow end-to-end with email enabled.

## F. Incomplete or known limitations

- No online payments (by design for now); no invoicing.
- No automatic virtual staging; no 3D tours (only external tour links/embeds); no presentation-video generation.
- No email verification at sign-up, no 2FA, no self-service account deletion/export.
- No CAPTCHA (honeypot, timing token and rate limits only).
- Marketing site is Greek only; the presentation page and PDFs support Greek and English.
- Photo enhancement runs synchronously within the request (fine for single photos; a job queue is needed for bulk processing).
- S3 storage adapter and Claid integration are implemented but untested against the live services; Dockerfile/compose untested
  (no Docker daemon in the development environment).
- Uploads go through the app server (simple and secure; for very high volume use presigned direct-to-storage uploads).
- Changing a public listing to link-only does not change its share token; use "Νέος σύνδεσμος κοινοποίησης" if needed.
- Analytics/view tracking intentionally not implemented.

## G. How to deploy

See [`DEPLOYMENT.md`](DEPLOYMENT.md). Recommended: one EU VPS with Docker Compose (PostgreSQL + app + Caddy for HTTPS), nightly
off-site backups of the database and uploads.

## H. Domain

Register the domain, point `A`/`AAAA` records to the server (or Vercel), set `APP_URL`, let Caddy issue certificates. Details in
`DEPLOYMENT.md`.

## I. Configure authentication, storage, email and AI

- Authentication: built in. Set `APP_SECRET` (≥ 32 random chars), `ADMIN_EMAILS`, optionally `SIGNUP_MODE=closed` for an invite-only
  pilot, `TRUST_PROXY=true` behind Caddy/Vercel.
- Storage: `STORAGE_DRIVER=local` with a backed-up volume, or `s3` with R2 credentials (private bucket).
- Email: Resend key, verified domain, `EMAIL_FROM`, `CONTACT_INBOX_EMAIL`.
- AI: `ANTHROPIC_API_KEY` (+ model/effort), `CLAID_API_KEY`.

## J. Approximate operating costs

Prices change; verify on the providers' pages before committing. Assumptions: 30 listings/month, 25 photos each, ~3 text generations
per listing, light traffic.

| Item | Published pricing (as found Oct 2026) | Estimate / month |
| --- | --- | --- |
| VPS (Option A), e.g. Hetzner CX22/CX23 | ~€4–5/month (sources disagree after the April 2026 price change) + ~20% for backups | **€5–7** |
| Off-site backup storage (e.g. R2, 20 GB) | $0.015/GB-month, 10 GB free | **< €1** |
| Domain (.gr / .com) | ~€10–30/year | **~€1–3** |
| Email — Resend | Free: 3,000 emails/month (100/day); Pro: $20/month for 50,000 | **€0** at this volume |
| AI text — Claude Opus 5.5 | $4 / $20 per million input/output tokens | ~3k input + ~3k output tokens per generation ≈ $0.07 → 90 generations ≈ **$6–8** (about half with Claude Sonnet 5.5 at $2/$10) |
| Photo enhancement — Claid.ai (optional) | Self-serve from $59 per 1,000 credits | If every photo is enhanced at ~1 credit each: 750 photos ≈ **$45** (only enhance selected photos to reduce this) |
| Option B instead of a VPS | Vercel Pro $20/user/month; Neon usage-based (from a few $ to tens of $/month); R2 as above | **€25–50** |

Typical Option A total for the assumptions above: **≈ €15–20/month without Claid**, ≈ €60/month with Claid on every photo.

Sources: [Neon pricing](https://neon.com/pricing), [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing),
[Resend pricing summary](https://automationatlas.io/answers/resend-pricing-explained-2026/),
[Hetzner 2026 price tracker](https://agentdeals.dev/hetzner-pricing-2026), [Claid business/API pricing](https://claid.ai/business),
Anthropic model pricing (Claude API documentation, Oct 2026).

## K. Prioritised launch checklist

**Before launch (must)**
1. Fill in real business details (`src/config/site.ts`) and final pricing/VAT text (`src/config/pricing.ts`).
2. Legal review of Privacy & Terms; replace all `[ ]` placeholders; remove the "draft" banner only after review (`src/components/marketing/legal.tsx`).
3. Deploy to a staging server (Option A), with HTTPS, `APP_SECRET`, `TRUST_PROXY`, admin account; build the Docker image and smoke-test.
4. Configure backups (database + uploads) and **test a restore**.
5. Configure Resend with your domain; test password reset, enquiry, invitation and contact emails.
6. Run your real property end-to-end (section E) on staging, on mobile and desktop; fix any issues found.
7. Decide `SIGNUP_MODE` (consider `closed` for a controlled pilot with a few agencies).
8. Run `npm run check` and `npm run test:e2e` on the release commit.

**Before launch (strongly recommended)**
9. Enable and evaluate AI text on 5–10 real listings; set an Anthropic spend limit.
10. Evaluate Claid on real photos (or keep built-in correction only).
11. Uptime monitoring and error alerting.
12. Sign DPAs with enabled providers; document data locations.

**Soon after launch**
13. Email verification at sign-up; self-service account deletion/export.
14. CAPTCHA (e.g. Turnstile) if spam appears.
15. Retention clean-up job for old enquiries/contact requests.

## L. Post-launch roadmap

1. Online payments and invoicing (e.g. Stripe or a Greek PSP with myDATA-compatible invoicing) once business details are final.
2. Background job queue for photo processing and bulk enhancement; presigned direct uploads to object storage.
3. Portal-ready exports (formats for Spitogatos / XE / Idealista), Facebook/Instagram image sizes.
4. English marketing site and English UI option.
5. Verified virtual-staging provider integration (with fidelity checks) once one meets the requirements.
6. Presentation-video generation from approved photos (clearly labelled as a slideshow, not a 3D walkthrough).
7. Agency features: roles per member, listing assignment, shared templates and brand presets.
8. Privacy-friendly view counts (aggregate, no cookies) after privacy review.
9. Two-factor authentication.
