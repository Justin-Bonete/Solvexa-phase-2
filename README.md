# Solvexa

Marketing site and client platform for an independent software developer. React + Vite + Tailwind v4 (client), Fastify (API, runs as a Vercel serverless function), PostgreSQL via Drizzle.

**Status: Phase 2 (Public site) complete.** Intake forms, chat, tickets, and the full portal and admin screens arrive in Phases 3 to 5. Unbuilt destinations are visibly disabled, never fake. See `docs/content.md` for how to add your real content.

## Run locally

Requires Node 20+ and a PostgreSQL database (local, or a free Neon project).

```bash
npm install
npm run setup                   # creates .env and generates the two secrets for you
# then open .env and set DATABASE_URL to your Neon pooled connection string
npm run db:migrate              # applies server/database/migrations
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long passphrase' npm run db:seed
npm run dev                     # web on :5173, API on :3001 (proxied at /api)
```

With `MAIL_TRANSPORT=console`, verification and reset emails are printed in the API terminal. That transport is **dev-only** and is refused when `NODE_ENV=production`.

## Scripts

| Script                                         | Purpose                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `npm run typecheck` / `lint` / `format:check`  | Static checks (strict TS, ESLint, Prettier)                                  |
| `npm test`                                     | Vitest: server tests run on in-memory Postgres (PGlite); web/component tests |
| `npm run build`                                | Client build, SSR build, then prerender of public routes                     |
| `npm run size`                                 | Gzipped initial JS against the 170 KB budget                                 |
| `npm run check:dist`                           | Fails if placeholder text leaks into production HTML                         |
| `npm run audit`                                | `npm audit` at high severity                                                 |
| `npm run admin:reset-mfa -- admin@example.com` | Break-glass: clear an admin's TOTP so they re-enroll (needs DATABASE_URL)    |
| `npm run test:e2e`                             | Playwright (needs a running app + DB; see docs/setup.md)                     |

## Layout

`src/` client · `server/` API (routes, controllers, services, middleware, models, database, adapters) · `shared/` Zod schemas and enums used by both · `content/` brand config and nav · `api/` Vercel entry · `docs/` setup, security, ADRs.

## Documentation

- `docs/content.md`: where each piece of content lives and how placeholders work
- `docs/setup.md`: Neon, Vercel, Resend, Turnstile setup and env vars
- `docs/security.md`: controls, what is verified, what is not
- `docs/adr/`: architecture decisions
