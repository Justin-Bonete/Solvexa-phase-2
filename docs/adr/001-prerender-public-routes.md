# ADR 001: Prerender public routes at build time

Status: accepted

Public routes are rendered to static HTML at build (vite SSR build plus scripts/prerender.mjs) and hydrated on the client. Portal, admin, and token pages use an empty app shell (app-shell.html) rendered client-side only. Reason: LCP and SEO targets are hard to meet with an empty-HTML SPA. Consequence: content edits reach crawlers on the next deploy or snapshot; users see fresh data through TanStack Query.
