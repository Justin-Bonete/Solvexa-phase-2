import { matchPath } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { cta } from '@content/cta';
import { BRAND_MESSAGE, ENTRY_PATHS } from '@content/brand';
import { services } from '@content/services';
import { projects, CATEGORIES } from '@content/projects';
import { faqs } from '@content/faqs';
import { testimonials } from '@content/testimonials';
import { landings } from '@content/landing';
import { improvementSteps, comparison, existingSystem } from '@content/solutions';
import { breadcrumbsFor, faqJsonLd, jsonLdFor, metaFor, routeMeta } from '@/lib/seo';
import { indexablePaths, prerenderPaths } from '@/prerender';
import { visibleFaqs, visibleProjects, visibleTestimonials } from '@/lib/visibility';
import { appRoutes } from '@/routes';

const routeExists = (to: string) => appRoutes.some((r) => matchPath(r.path, to.split('#')[0] as string));

describe('brand message', () => {
  it('matches the specified text exactly', () => {
    expect(BRAND_MESSAGE).toBe(
      "You don't have to start from scratch. If you need a new system, I can build it. If you already have one, I can improve it. If it's broken, I can troubleshoot it. If it's outdated, I can modernize it. If it needs new features, I can enhance it. And if you need someone to maintain it, I can keep it running.",
    );
  });
  it('uses first person singular only', () => {
    const all = JSON.stringify([services, landings, faqs, ENTRY_PATHS, existingSystem, improvementSteps]);
    expect(all).not.toMatch(/\b(our team|we are|we can|we offer|we build|our services|our work)\b/i);
  });
});

describe('services', () => {
  it('has 12 services with unique anchors, a CTA each, and positioning verbs', () => {
    expect(services).toHaveLength(12);
    expect(new Set(services.map((s) => s.id)).size).toBe(12);
    const verbs = new Set(['Build', 'Improve', 'Maintain', 'Modernize', 'Secure', 'Scale']);
    for (const s of services) {
      expect(cta[s.cta]).toBeDefined();
      expect(verbs.has(s.verb)).toBe(true);
      expect(s.points.length).toBeGreaterThan(0);
    }
  });
});

describe('CTAs never lie', () => {
  it('enabled CTAs point at real routes; disabled CTAs state a reason', () => {
    for (const [id, c] of Object.entries(cta)) {
      if (c.enabled) expect(routeExists(c.to), `${id} -> ${c.to}`).toBe(true);
      else expect(c.reason, id).toBeTruthy();
    }
  });
  it('entry paths, landing pages and nav destinations exist', () => {
    for (const p of ENTRY_PATHS) expect(routeExists(p.to), p.to).toBe(true);
    for (const l of landings) expect(routeExists(l.path), l.path).toBe(true);
  });
  it('the contact CTAs are disabled until the contact hub exists', () => {
    expect(routeExists('/contact')).toBe(false);
    expect(cta['start-project'].enabled).toBe(false);
  });
  it('the landing page that owns #support-plans defines it', () => {
    expect(landings.find((l) => l.slug === 'maintenance')?.supportNote?.id).toBe('support-plans');
  });
});

describe('honesty: nothing is invented', () => {
  it('seed projects only carry a name; every other fact is empty and results are "not yet measured"', () => {
    for (const p of projects) {
      expect(p.placeholder).toBe(true);
      expect(p.results).toBeNull();
      expect(Object.values(p.tech).flat()).toHaveLength(0);
      expect(p.problem + p.solution + p.summary).toBe('');
      expect(p.deployStatus).toBe('unspecified');
      for (const c of p.categories) expect(CATEGORIES.some((x) => x.id === c)).toBe(true);
    }
    expect(new Set(projects.map((p) => p.slug)).size).toBe(projects.length);
  });
  it('placeholders are hidden when the flag is on and shown when off', () => {
    expect(visibleProjects(true)).toHaveLength(0);
    expect(visibleProjects(false)).toHaveLength(projects.length);
    expect(visibleTestimonials(true)).toHaveLength(0);
    expect(visibleTestimonials(false)).toHaveLength(testimonials.length);
    expect(testimonials.every((t) => !t.verified)).toBe(true);
  });
  it('visible FAQs contain no prices, durations, or response-time promises', () => {
    for (const f of visibleFaqs(true)) {
      expect(f.placeholder).toBe(false);
      expect(f.a + f.q).not.toMatch(/[$€£₱]|\bUSD\b|\b\d+\s*(hours?|days?|weeks?|months?)\b|within \d+/i);
    }
    expect(visibleFaqs(true).length).toBeLessThan(faqs.length);
  });
  it('comparison table describes targets, not measured claims', () => {
    expect(comparison.caption).toMatch(/targets/i);
    expect(JSON.stringify(comparison)).not.toMatch(/\d+\s?%|\d+x/);
  });
  it('JSON-LD never includes ratings, reviews, or addresses', () => {
    for (const path of ['/', '/faq', '/services', '/projects']) {
      expect(JSON.stringify(jsonLdFor(path, visibleFaqs(true)))).not.toMatch(
        /aggregateRating|"review"|address|telephone|priceRange/,
      );
    }
  });
});

describe('SEO', () => {
  it('has unique, sensibly sized titles and descriptions for every indexable page', () => {
    const paths = indexablePaths(false);
    const titles = paths.map((p) => metaFor(p).title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const p of paths.filter((x) => !x.startsWith('/projects/'))) {
      const m = metaFor(p);
      expect(m.description.length, p).toBeGreaterThanOrEqual(50);
      expect(m.description.length, p).toBeLessThanOrEqual(175);
      expect(m.title.length, p).toBeLessThanOrEqual(75);
    }
  });
  it('sitemap excludes placeholder project pages in production and includes them otherwise', () => {
    expect(indexablePaths(true).some((p) => p.startsWith('/projects/'))).toBe(false);
    expect(indexablePaths(false).filter((p) => p.startsWith('/projects/'))).toHaveLength(projects.length);
    for (const p of indexablePaths(false)) {
      expect(routeExists(p), p).toBe(true);
      if (!p.startsWith('/projects/')) expect(routeMeta[p]?.indexable, p).toBe(true);
    }
  });
  it('placeholder project pages are noindex even when visible in development', () => {
    expect(metaFor(`/projects/${projects[0]?.slug}`).indexable).toBe(false);
  });
  it('private and auth pages are never in the sitemap', () => {
    for (const p of ['/portal', '/admin', '/mfa', '/login', '/register'])
      expect(indexablePaths(false)).not.toContain(p);
    expect(prerenderPaths(false)).toContain('/login');
  });
  it('FAQPage JSON-LD only lists visible questions', () => {
    const ld = faqJsonLd(visibleFaqs(true)) as { mainEntity: { name: string }[] };
    expect(ld.mainEntity).toHaveLength(visibleFaqs(true).length);
    expect(JSON.stringify(ld)).not.toContain('Placeholder');
    expect(faqJsonLd([])).toBeNull();
  });
  it('breadcrumbs: none on home, Home > Page elsewhere, Home > Projects > Name for case studies', () => {
    expect(breadcrumbsFor('/')).toEqual([]);
    expect(breadcrumbsFor('/services').map((c) => c.name)).toEqual(['Home', 'Services']);
    expect(breadcrumbsFor(`/projects/${projects[0]?.slug}`).map((c) => c.name)).toEqual([
      'Home',
      'Projects',
      projects[0]?.name,
    ]);
  });
  it('home has ProfessionalService data', () => {
    expect(JSON.stringify(jsonLdFor('/', []))).toContain('ProfessionalService');
  });
});

describe('legal drafts', () => {
  it('visible legal text never contains owner instructions', async () => {
    const { privacy, terms } = await import('@content/legal');
    for (const doc of [privacy, terms]) {
      for (const s of doc.sections)
        for (const b of s.body) expect(b, s.heading).not.toMatch(/placeholder|to do/i);
      expect(doc.sections.some((s) => s.todo?.length)).toBe(true);
    }
  });
});
