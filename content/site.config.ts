/**
 * Single source of truth for brand, contact details and placeholder flags.
 * Anything not verified is marked `placeholder: true`. When HIDE_PLACEHOLDERS is
 * true (production default), placeholder content is hidden from public pages.
 */
export type Placeholder<T> = { value: T; placeholder: boolean };
const ph = <T>(value: T, placeholder = true): Placeholder<T> => ({ value, placeholder });

export const siteConfig = {
  brand: {
    name: 'Solvexa',
    tagline: ph('Software Development & Technical Solutions', false),
    logo: ph<string | null>(null),
  },
  voice: 'first-person-singular',
  /** Set to true in production via VITE_HIDE_PLACEHOLDERS=true. Defaults to hidden in production builds. */
  hidePlaceholders:
    (import.meta.env?.VITE_HIDE_PLACEHOLDERS ?? String(import.meta.env?.PROD ?? false)) === 'true',
  contact: {
    email: ph('hello@example.com'),
    phone: ph<string | null>(null),
    location: ph<string | null>(null),
    timezone: ph<string | null>(null),
    workingHours: ph<string | null>(null),
    social: { github: ph<string | null>(null), linkedin: ph<string | null>(null) },
  },
  /** Canonical origin, used for canonical URLs, sitemap and JSON-LD. */
  siteUrl: import.meta.env?.VITE_SITE_URL ?? 'http://localhost:5173',
  positioningVerbs: ['BUILD', 'IMPROVE', 'MAINTAIN', 'MODERNIZE', 'SECURE', 'SCALE'] as const,
} as const;

export const credentialsWarning =
  "Never send passwords, API keys, or server credentials through this form. I'll arrange a secure method if access is needed.";

export function visible<T>(p: Placeholder<T>): T | null {
  return siteConfig.hidePlaceholders && p.placeholder ? null : p.value;
}
