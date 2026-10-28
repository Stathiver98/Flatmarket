# Deployment guide

Nothing has been deployed or purchased. Two tested-in-principle options are described; **option A is recommended** for launch
(lowest cost, data stays in the EU, local file storage works as-is). The Docker files were written but could not be built in the
development environment (no Docker daemon), so do a full dry run on the server before pointing your domain at it.

## Option A — single EU VPS with Docker Compose (recommended)

1. **Server**: create a small VPS in an EU region (e.g. Hetzner CX22/CX23 in Germany/Finland, 2 vCPU, 4 GB RAM, Ubuntu 24.04).
   Enable the provider's automatic backups.
2. **Install Docker**: follow docs.docker.com/engine/install/ubuntu, then `sudo usermod -aG docker $USER`.
3. **Code**: `git clone <your repo> flatmarket && cd flatmarket`.
4. **Configuration**:
   ```bash
   cp .env.example .env.production
   # edit .env.production:
   #   APP_URL=https://your-domain.gr
   #   APP_SECRET=$(openssl rand -base64 48)
   #   POSTGRES_PASSWORD=<long random password>   (also used by docker-compose.yml)
   #   ADMIN_EMAILS=you@your-domain.gr
   #   optional: ANTHROPIC_API_KEY, CLAID_API_KEY, EMAIL_PROVIDER=resend, RESEND_API_KEY, EMAIL_FROM, CONTACT_INBOX_EMAIL
   cp Caddyfile.example Caddyfile   # replace the domain names
   ```
5. **DNS** (see "Domain" below) must point to the server before starting, so Caddy can obtain HTTPS certificates.
6. **Start**: `docker compose --env-file .env.production up -d --build`. The app container runs `prisma migrate deploy` on start.
7. **Admin account**: sign up at `https://your-domain.gr/signup` with an email listed in `ADMIN_EMAILS`, or run
   `docker compose exec app npm run user:create -- --email you@your-domain.gr --name "Όνομα" --admin`.
8. **Do not run `npm run db:seed` in production** (it refuses when `NODE_ENV=production`).
9. **Backups** (essential): the `pgdata` and `uploads` volumes hold everything. In addition to VPS snapshots, schedule a nightly
   `pg_dump` and an off-site copy of the uploads volume (e.g. `restic` to an S3 bucket). Test a restore before launch.
10. **Updates**: `git pull && docker compose --env-file .env.production up -d --build`.

## Option B — Vercel + managed Postgres + R2

- Vercel (Pro plan for commercial use), Neon or Supabase Postgres (EU region), Cloudflare R2 bucket (private) for files.
- Set `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION=auto`, `S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`,
  `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Local disk storage does **not** work on serverless platforms.
- Build command `npx prisma generate && next build`; run `npx prisma migrate deploy` from CI or your machine against the production
  database before each release.
- Set `TRUST_PROXY=true`.
- Check function limits: uploads up to 20 MB and PDF/ZIP generation (up to ~120 s for large packages) must fit your plan's request
  body and duration limits; Vercel's default request body limit for functions is lower than 20 MB, so photos may need to be resized
  client-side or uploaded directly to R2 with presigned URLs (not implemented yet). For this reason Option A is simpler today.
- The S3 adapter is implemented against the AWS SDK but was **not exercised against a real bucket** in development — test uploads,
  downloads and deletion on staging first.

## Domain

1. Register the domain (for `.gr`, through an accredited registrar listed by EETT/FORTH; `.com` from any registrar).
2. Create DNS records: `A @ → <server IPv4>`, `AAAA @ → <server IPv6>` (optional), `CNAME www → your-domain.gr`
   (Option B: use the records Vercel shows).
3. Wait for propagation (`dig your-domain.gr +short`), then start Caddy (Option A). Caddy obtains and renews Let's Encrypt
   certificates automatically.
4. Set `APP_URL=https://your-domain.gr` and restart.

## Email (Resend)

1. Create a Resend account, add your domain, add the SPF/DKIM DNS records it shows, wait for verification.
2. Create an API key with sending permission.
3. Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM="Flatmarket <noreply@your-domain.gr>"`, `CONTACT_INBOX_EMAIL=you@…`.
4. Test: password reset, contact form, enquiry on a link-only test listing, team invitation. Check the admin "Αιτήματα" page shows
   "Email στάλθηκε".

## AI text generation (Anthropic)

1. Create an organisation at console.anthropic.com, add billing, set a monthly spend limit, create an API key.
2. Set `ANTHROPIC_API_KEY`. Optional: `AI_TEXT_MODEL` (default `claude-opus-5-5`; `claude-sonnet-5-5` is roughly half the price),
   `AI_TEXT_EFFORT` (`low|medium|high`, default `medium`).
3. Test on a listing: Step 6 → "Δημιουργία προτάσεων". Check the admin processing log for status and duration.
4. Review Anthropic's commercial terms and data-retention settings for your organisation.

## Photo enhancement (Claid.ai)

1. Create a Claid account, buy credits, create an API key.
2. Set `CLAID_API_KEY` (optional `CLAID_HDR_INTENSITY`, default 60).
3. **Test first on a few real photos**: the integration follows Claid's published API (`POST /v1/image/edit/upload` with
   `restorations.decompress` and `adjustments.hdr`) but could not be called during development. Compare results against the
   originals and confirm nothing is altered beyond light/colour.

## Operations checklist

- Uptime monitoring on `/` and `/login` (e.g. UptimeRobot, Better Stack).
- Log retention at your host; logs contain identifiers, not personal content.
- Monitor disk usage of the uploads volume (photos: ~3–8 MB per original + derivatives).
- Keep dependencies updated monthly (`npm outdated`, rebuild, run `npm run check` and `npm run test:e2e`).
