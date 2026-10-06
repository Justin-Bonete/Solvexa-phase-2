# Editing content

All public content lives in `content/` as typed data. Pages read from it; nothing is hardcoded in JSX. The shapes mirror the planned database tables, so moving to admin-managed content in Phase 5 is a data move, not a rewrite.

| File                      | What it controls                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `content/site.config.ts`  | Brand name, tagline, contact details, `hidePlaceholders`, site URL                     |
| `content/brand.ts`        | Hero text, the core brand message, entry paths, "Why work with me", "How I work"       |
| `content/services.ts`     | The 12 services (anchors on `/services#id`)                                            |
| `content/solutions.ts`    | Existing-system problems, the 8-step improvement process, the old vs. modernized table |
| `content/landing.ts`      | New system / Enhancement / Maintenance pages                                           |
| `content/projects.ts`     | Portfolio and case studies                                                             |
| `content/technologies.ts` | Technology page                                                                        |
| `content/faqs.ts`         | FAQ (also feeds FAQPage structured data)                                               |
| `content/testimonials.ts` | Testimonials (hidden in production unless `verified: true`)                            |
| `content/legal.ts`        | Privacy and Terms drafts                                                               |
| `content/about.ts`        | About page                                                                             |
| `content/cta.ts`          | Every call-to-action and whether its destination exists yet                            |

## Placeholders

Anything unverified is flagged and hidden in production builds (`VITE_HIDE_PLACEHOLDERS=true`, the default for `npm run build`).

- **Project:** replace the empty fields and set `placeholder: false`. Until then it appears only in development and is `noindex`.
- **FAQ:** write the real answer and set `placeholder: false`.
- **Testimonial:** add only a real quote you have permission to publish and set `verified: true`.
- **Results:** put only measured facts in `results`. `null` shows "Not yet measured".
- **Legal:** fill the `todo` notes into `body` text, then have the pages reviewed by a lawyer.

`npm run check:dist` fails a production build if placeholder text leaks into the HTML.

## Turning on a CTA

In `content/cta.ts`, set `enabled: true` once the destination page exists. A test fails if an enabled CTA points at a route that does not exist.
