# Flatmarket

**Better listings. Clearer property decisions.** — «Καλύτερες αγγελίες. Πιο ξεκάθαρες αποφάσεις.»

Flatmarket helps Greek real estate agents, agencies and property owners turn property facts and photos into a clear, professional
presentation: a guided questionnaire, organised photos, honest Greek/English listing copy, a shareable presentation page, a PDF
brochure and a downloadable marketing package. The customer-facing interface is in Greek.

Flatmarket creates marketing material. It does **not** act as a broker.

> Status: functional MVP, tested end-to-end locally. **Not yet ready for public launch** — see
> [`docs/LAUNCH_READINESS.md`](docs/LAUNCH_READINESS.md) for exactly what remains.

---

## Quick start (local development)

Requirements: Node.js ≥ 22, PostgreSQL 16 (local or Docker).

```bash
# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Create a database (example for a local PostgreSQL)
createuser flatmarket --pwprompt        # e.g. password: flatmarket_dev
createdb flatmarket --owner flatmarket

# 3. Configure environment
cp .env.example .env
#    then set APP_SECRET:  openssl rand -base64 48

# 4. Create the schema and load clearly-labelled SAMPLE data
npm run db:migrate
npm run db:seed

# 5. Run
npm run dev            # http://localhost:3000
```

Sample accounts created by the seed (local development only; the seed refuses to run when `NODE_ENV=production`):

| Email | Password | Role |
| --- | --- | --- |
| `demo@flatmarket.local` | `flatmarket-demo-2026` | owner of one **SAMPLE** listing (published link-only) |
| `agency@flatmarket.local` | `flatmarket-demo-2026` | agency account (team features) |
| `admin@flatmarket.local` | `flatmarket-demo-2026` | administrator (`/admin`) |

Or simply sign up at `/signup` with your own email.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build and server |
| `npm run check` | Typecheck + lint + unit tests |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright, production build on port 3100, database `flatmarket_test`) |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations in production (non-destructive) |
| `npm run db:seed` | Load sample data (development only) |
| `npm run user:create -- --email you@x.gr --name "Όνομα" [--admin] [--agency "Γραφείο"]` | Create an account or promote one to admin |

End-to-end tests need a separate database: `createdb flatmarket_test --owner flatmarket`, then `npx next build && npm run test:e2e`.

---

## What is implemented

**Public website (Greek):** Home, How it works, Services, For agencies, Pricing, Contact/demo request, Login/Sign-up, Privacy and
Terms (both clearly marked as drafts requiring legal review). No invented testimonials, statistics, addresses or phone numbers.
Pricing is driven by [`src/config/pricing.ts`](src/config/pricing.ts) and marked as indicative; there are no card payments — every
package leads to a request form.

**Accounts and roles:** email/password accounts (individual or agency), administrator role, agency team invitations (owner invites by
email; secure single-use link valid 7 days, emailed if email is configured, otherwise shown to copy). Users only ever see listings of
workspaces they belong to; every page, server action and file route checks this on the server.

**Listing workflow (8 steps, saved at every step):**
1. Basic details (purpose, type, location with privacy level, price, area, rooms, floor, availability).
2. Characteristics — adaptive questionnaire with "Unknown" answers; nothing is inferred from photos.
3. Photos — drag-and-drop multi-upload with real progress, validation of the actual bytes, previews, reordering (drag, touch or
   keyboard/buttons), room assignment, cover selection, deletion. Originals are preserved untouched; public versions are
   metadata-free (no GPS/EXIF).
4. Floor plan — upload plans and place room markers that link to the room's photos (no invented shapes or dimensions).
5. Completeness — transparent, deterministic indicator (core 75% / optional 25%), "Unknown" counts as answered.
6. Content — Greek and English headline, summary, description, features, social caption. Manual writing always works; AI generation
   is optional, uses only confirmed facts, never overwrites approved sections without explicit consent, and an automatic checker flags
   unsupported claims (views, distances, transport, investment/legal claims, superlatives) before approval.
7. Review & approval — everything that will be public, privacy summary, contact/visibility settings, external tour link, missing
   information, explicit approval checkbox.
8. Publish & files — publish as **link-only** (unguessable token, not indexed) or **public** (indexable URL); update, regenerate the
   link, unpublish, archive or permanently delete (files included). Downloads: PDF brochure (Greek/English), factsheet PDF, approved
   photos ZIP, full package ZIP, copy buttons for descriptions.

**Publishing model:** the public page renders an immutable *snapshot* taken at publication. Editing a published listing never changes
the live page until the owner approves again and republishes.

**Presentation page:** hero gallery with full-screen viewer, facts, Greek/English switch, room-by-room guide, floor plan with clickable
markers, embedded tour (Matterport/Kuula/YouTube) or safe external link, honest "information not provided" section, labelled digitally
staged photos, contact details and an enquiry form that states who receives the message.

**Photo enhancement:** built-in deterministic correction (levels, white balance, gentle saturation/sharpening — no content changes)
always available; Claid.ai professional light correction when `CLAID_API_KEY` is set. Every result is a separate version with provider
and parameters recorded, status, errors and retry; the owner chooses which version is used. **Virtual staging** is a separate, manual
workflow (upload of a designer's image), always labelled «Ψηφιακή επίπλωση / Digitally staged», shown next to the original and
requiring explicit review — there is no automatic staging provider (see limitations).

**Dashboard:** search, status filters (Draft, Awaiting review, Ready, Published, Archived), cover, title, location, price, last update,
unread enquiries; actions to continue, preview, publish/unpublish, download, archive/restore. **No analytics are invented**; view
tracking is not implemented.

**Admin workspace (`/admin`, admins only, 404 for everyone else):** listing review with notes to the owner, return-to-draft and
moderation takedown (admins can never approve or publish on a user's behalf), contact/service requests with status and internal notes,
users list with password-reset link generation (for installations without email), integration status and an AI/image processing log
(provider, model, status, error code, duration — never content).

---

## Architecture

```
src/
  app/                 Next.js App Router
    (marketing)/       public website
    (auth)/            login, signup, password reset
    app/               authenticated workspace (dashboard, listing steps, settings, team, enquiries)
    admin/             administrator workspace
    p/[slug], s/[token] public / link-only presentation pages
    preview/[id]       owner preview
    api/               uploads, private file serving, public assets, exports
  components/          ui/ (design system), marketing/, app/, listing/
  lib/                 pure domain logic shared by client and server
    listing/           options & labels (el/en), validation, completeness, presentation model, AI fact sheet, claim checker
  server/              server-only code
    auth/              password hashing (scrypt), sessions, guards
    actions/           server actions (all re-check authorization)
    ai/                Anthropic integration
    images/            validation, derivatives, enhancement providers
    exports/           PDF (react-pdf) and ZIP generation
    storage/           local disk / S3-compatible adapter
    security/          rate limiting, request origin checks, signed form tokens
  config/              pricing and site configuration (edit before launch)
prisma/                schema, migrations, seed
tests/unit, tests/e2e  Vitest and Playwright
```

### Key decisions

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4.** Cache Components is disabled on purpose: the app is per-user and dynamic.
  There is no `proxy.ts`: proxies buffer request bodies (10 MB) which would truncate photo uploads; authorization is enforced in pages,
  layouts, server actions and route handlers instead.
- **PostgreSQL + Prisma 7** (driver adapter `@prisma/adapter-pg`), migrations in `prisma/migrations`.
- **Own session authentication**: scrypt password hashes (Node built-in), random session tokens stored only as SHA-256 hashes,
  `httpOnly`/`SameSite=Lax`/`Secure` cookies, login/sign-up rate limits, constant-time comparisons, no account enumeration on reset.
- **Storage adapter**: local private directory (single server) or any S3-compatible bucket (R2, S3, B2). Files are never served
  directly; routes check permissions or publication state. Public pages only expose metadata-free derivatives in the snapshot.
- **AI**: Anthropic Claude via the official SDK, server-side only, model configurable (`AI_TEXT_MODEL`, default `claude-opus-5-5`),
  adaptive thinking, JSON-schema structured output, server-side refusal fallback (`fallbacks: "default"`), validated with Zod.
  Only the fact sheet built from confirmed data is sent; the private address is excluded unless the owner made it public.
- **PDF**: `@react-pdf/renderer` with bundled OFL fonts (Commissioner, Noto Serif Display) for correct Greek rendering.
  React-pdf caches glyphs per font-family name across documents, which dropped Latin letters after a Greek PDF; each render now
  registers uniquely named families and removes them afterwards (covered by an E2E regression check).
- **Rate limiting** is stored in PostgreSQL so it works across instances (sign-up, login, uploads, AI, exports, contact, enquiries).

### Brand and colour system

Warm, editorial and restrained: cream/paper backgrounds (`#f6f1e9`, `#fffdf9`) that flatter property photography, charcoal ink
(`#1d1b18`) for text, stone neutrals for structure, and a single accent — **deep terracotta** (`#9b4224`), the colour of Greek roof
tiles and clay — for primary actions. Deep olive (`#4b5d38`) marks confirmed/positive states. Typography: Noto Serif Display for
editorial headlines, Commissioner (by Greek type designer Kostas Bartsokas) for UI and body; both have full Greek support and are
self-hosted. The wordmark is typographic with a small "floor plan" mark; no third-party logos are used.

---

## Environment variables

All variables are documented in [`.env.example`](.env.example). Summary:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection |
| `APP_URL` | yes | Public base URL (links, PDFs, emails) |
| `APP_SECRET` | yes (≥ 32 chars) | Signs form tokens, hashes IPs |
| `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR`, `S3_*` | yes (defaults to local disk) | File storage |
| `ANTHROPIC_API_KEY`, `AI_TEXT_MODEL`, `AI_TEXT_EFFORT`, `AI_TEXT_FALLBACKS` | optional | AI listing copy |
| `CLAID_API_KEY`, `CLAID_HDR_INTENSITY` | optional | Professional photo enhancement |
| `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_INBOX_EMAIL` | optional | Email delivery |
| `ADMIN_EMAILS` | optional | Emails promoted to admin at sign-up/login |
| `SIGNUP_MODE` | optional | `open` or `closed` |
| `TRUST_PROXY` | production behind a proxy | Trust `X-Forwarded-For` for rate limiting |

Without optional keys every feature degrades honestly: manual text editing, built-in photo correction only, enquiries/requests stored
in the database with "no email sent" shown to the user.

## Further documentation

- [`docs/LAUNCH_READINESS.md`](docs/LAUNCH_READINESS.md) — what works, what is missing, costs, prioritised launch checklist, roadmap.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploying, domain, HTTPS, storage, email, AI, backups.
- [`docs/DATA_HANDLING.md`](docs/DATA_HANDLING.md) — what data is processed where, security measures, known limitations.
- [`docs/FIRST_LISTING.md`](docs/FIRST_LISTING.md) — step-by-step guide to publishing your first real listing.
