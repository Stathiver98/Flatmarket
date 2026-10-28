# Data handling, privacy and security

This document describes what the application does today. It is technical input for your privacy notice and DPIA — it is **not**
a statement of legal compliance. Have it reviewed by a lawyer / data-protection professional before launch.

## Data stored

| Data | Where | Notes |
| --- | --- | --- |
| Accounts (name, email, scrypt password hash, role, last login) | PostgreSQL | Passwords are never stored in plain text. |
| Sessions | PostgreSQL | Only the SHA-256 hash of the session token is stored; cookie is `httpOnly`, `SameSite=Lax`, `Secure` in production, 30 days. |
| Workspaces (display name, contact details, logo, registry number) | PostgreSQL + storage | Shown on published pages/PDFs only when the owner enables branding. |
| Listings (facts, private address, characteristics, texts, status) | PostgreSQL | Address is private unless the owner selects "full address" visibility. |
| Published snapshot | PostgreSQL (JSON) | Frozen copy of what is public; deleted on unpublish/archive/takedown. |
| Original photos / floor plans | Storage (private) | Kept byte-for-byte, may contain camera metadata (incl. GPS). Never served publicly; downloadable by the owner. |
| Display/thumbnail derivatives | Storage | Auto-rotated, re-encoded, **all metadata removed**. Only these are served on public pages. |
| Enhanced / staged versions | Storage | Separate files; provider, parameters, status and errors recorded. |
| Enquiries (name, email, phone, message, consent time, IP hash) | PostgreSQL | Visible only to members of the listing's workspace. |
| Contact/demo requests | PostgreSQL | Visible to administrators. |
| Rate-limit counters | PostgreSQL | Keyed by HMAC hash of IP / user id; not reversible. |
| Processing log (`AiJob`) | PostgreSQL | Provider, model, status, error code, duration, token counts — never prompts, outputs or images. |
| Application logs | stdout (your hosting) | Structured JSON; identifiers and statuses only. Keys like email/phone/address/message/prompt are redacted defensively. |

## Third parties (processors) — only when configured

| Service | Receives | When |
| --- | --- | --- |
| Hosting / database provider | Everything above | Always (your choice of provider and region). |
| S3-compatible storage (e.g. Cloudflare R2) | Photos, plans, logos | When `STORAGE_DRIVER=s3`. |
| Anthropic (Claude API) | Fact sheet of confirmed listing facts and the owner's notes/limitations; **not** the private address (unless made public), not photos, not personal data of the owner | Only when a user clicks "Δημιουργία προτάσεων". |
| Claid.ai | The original photo being enhanced | Only when a user runs the Claid enhancement on a photo. |
| Resend | Recipient email, subject, message text (enquiries, invitations, password reset, contact requests) | Only when email is configured. |
| External tour providers (Matterport, Kuula, YouTube) | Visitor's browser loads the embed | Only on pages where the owner added a tour link. |

Before launch: sign/accept DPAs with each provider you enable, choose EU regions where available, and document any transfers outside
the EEA.

## Security measures implemented

- Authorization checked server-side on every page, server action and file route (workspace membership; admins read-only for listings).
- Admin area returns 404 to non-admins; admins cannot approve or publish for users.
- Upload validation by decoding the actual bytes (JPEG/PNG/WebP), 20 MB limit, minimum dimensions, per-listing limits, origin check
  (CSRF) on upload route handlers; Server Actions are origin-checked by Next.js.
- Storage keys are validated against path traversal; files are never served from a public directory.
- Link-only pages use 192-bit random tokens; can be regenerated to revoke a leaked link. Not indexed (`noindex`, robots disallow).
- Rate limits: sign-up, login (per IP and per account), password reset, uploads, AI generation, exports, contact form, enquiries.
- Spam protection on public forms: honeypot field, signed timestamp token (rejects instant/expired submissions), link-count heuristic.
- Security headers: CSP (frame/object/base/form restrictions; iframes only from known tour providers), `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. File responses carry a sandboxing CSP.
- Output escaping by React; no `dangerouslySetInnerHTML`.
- Secrets only in environment variables; `.env*` is git-ignored; API keys never reach the browser.

## Deletion

- **Delete listing** (Step 8, requires typing the reference): removes database rows (photos, versions, plans, texts, enquiries, events)
  and all stored files for the listing.
- **Unpublish / archive**: removes the public snapshot immediately; data remains for the owner.
- Not yet implemented: self-service **account deletion** and data export for a user (handle by request via admin for now);
  automatic retention/clean-up of old enquiries and contact requests; deletion from backups (follows your backup retention).

## Known limitations

- No CAPTCHA (honeypot + timing + rate limits only). Consider Cloudflare Turnstile if spam appears.
- No email verification at sign-up; no two-factor authentication.
- Sessions are not shown/revocable per device in the UI (password change signs out other devices).
- `X-Forwarded-For` is trusted only with `TRUST_PROXY=true`; set it only behind your own reverse proxy.
- No analytics or view tracking are implemented (nothing to disclose today; review if you add any).
