import { siteConfig } from '@content/site.config';
import { visibleProjects } from '@/lib/visibility';

const CONTENT_PAGES = [
  '/',
  '/services',
  '/solutions',
  '/projects',
  '/new-system-development',
  '/enhancement',
  '/maintenance',
  '/process',
  '/technology',
  '/about',
  '/faq',
  '/privacy',
  '/terms',
];
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

/** Pages listed in the sitemap. Placeholder projects are excluded when placeholders are hidden. */
export const indexablePaths = (hide = siteConfig.hidePlaceholders) => [
  ...CONTENT_PAGES,
  ...visibleProjects(hide).map((p) => `/projects/${p.slug}`),
];
/** Everything rendered to static HTML at build time. */
export const prerenderPaths = (hide = siteConfig.hidePlaceholders) => [
  ...indexablePaths(hide),
  ...AUTH_PAGES,
];
