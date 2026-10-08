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

## File uploads (Vercel Blob, private)

Uploaded files are stored privately and are only ever served through the admin API.

1. In Vercel: Storage > Create > Blob, and choose **Private** access. (CLI: `vercel blob create-store solvexa-uploads --access private`.)
2. Connect the store to the project so `BLOB_READ_WRITE_TOKEN` is added to the function's environment.
3. Set `STORAGE_DRIVER=blob`.

Limits: 4 MB per file (Vercel caps function request bodies at 4.5 MB), 5 files per request. Locally, `STORAGE_DRIVER=local` writes to `.data/uploads` (outside the web root, git-ignored). Production refuses `local`.

## Testing-only deploys

To try a deploy before Resend and Blob exist, set `ALLOW_DEV_SERVICES=true` and `STORAGE_DRIVER=none`. Then: emails are printed into the Vercel function logs (so you can copy verification links from there), and file uploads fail with a clear message while the request itself still saves. This mode exists for testing only. Remove it before real clients use the site.

## Turnstile (needs a domain)

Create a site in Cloudflare Turnstile, then set `VITE_TURNSTILE_SITE_KEY` (public), `TURNSTILE_SECRET` and `REQUIRE_TURNSTILE=true`. The widget is on the signup form and both intake forms, and the site's CSP already allows Cloudflare. The widget and server check are written to Cloudflare's documentation but have **not been exercised against the live service**; test signup and a form submission after enabling it.

## Admin recovery

Lost authenticator and recovery codes: `DATABASE_URL=... npm run admin:reset-mfa -- you@example.com`.
