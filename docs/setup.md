# Setup

## Environment variables

See `.env.example`. Required in production: `DATABASE_URL`, `APP_URL`, `SESSION_SECRET` (48+ random chars), `TOTP_ENCRYPTION_KEY` (base64 of 32 bytes), `MAIL_TRANSPORT=resend`, `RESEND_API_KEY`. Only `VITE_*` variables reach the browser; none of them is a secret.

## Database (Neon or any Postgres)

1. Create a project and copy the **pooled** connection string into `DATABASE_URL`.
2. `npm run db:migrate`, then `npm run db:seed` (set `ADMIN_EMAIL` and `ADMIN_PASSWORD` once; there is no default admin).
3. Recommended after migrating: `REVOKE UPDATE, DELETE ON activity_logs FROM <app_role>;` so the audit log is append-only at the database level (the migration cannot do this because role names differ per host).

## Vercel

1. Import the repo. Build command and output directory are set in `vercel.json`.
2. Add the environment variables above. Set `VITE_SITE_URL` to the real origin and `VITE_HIDE_PLACEHOLDERS=true`.
3. **Plan note:** Vercel Hobby is for non-commercial use. Move to Pro (or another host) before real clients use the site.

## Resend (needs a domain you own)

Verify the domain, create an API key, set `MAIL_FROM` to an address on that domain. Free tier limits are 3,000 emails/month and 100/day; the app stops at 90/day and tells the user honestly when sending is paused.

## Turnstile (needs a domain)

Create a site in Cloudflare Turnstile, set `TURNSTILE_SECRET` and `REQUIRE_TURNSTILE=true`. The server-side check is implemented; the browser widget is **not built yet** (Phase 3), so keep `REQUIRE_TURNSTILE=false` until then.

## Admin recovery

Lost authenticator and recovery codes: `DATABASE_URL=... npm run admin:reset-mfa -- you@example.com`.
