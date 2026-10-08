import { siteConfig } from '@content/site.config';
import type { Faq } from '@content/faqs';
import { projects } from '@content/projects';

export type RouteMeta = { title: string; description: string; indexable: boolean; label: string };

const base = siteConfig.brand.name;
const m = (label: string, title: string, description: string, indexable = true): RouteMeta => ({
  label,
  title: `${title} | ${base}`,
  description,
  indexable,
});

export const routeMeta: Record<string, RouteMeta> = {
  '/': {
    label: 'Home',
    title: `${base} | Software Development & Technical Solutions`,
    description:
      'I build, improve, and maintain custom software for businesses, schools, and organizations: new systems, modernization of existing ones, fixes, and long-term support.',
    indexable: true,
  },
  '/services': m(
    'Services',
    'Software development services',
    'Twelve services from custom software and web applications to maintenance, bug fixing, database work, integrations, and performance optimization.',
  ),
  '/solutions': m(
    'Solutions',
    'Improve or modernize an existing system',
    'Already have a system? I can fix, improve, or modernize it without starting over, including legacy PHP systems, slow databases, and outdated interfaces.',
  ),
  '/projects': m(
    'Projects',
    'Projects and case studies',
    'Software projects I have worked on, filterable by category, with the problem, solution, technology, and verified results for each.',
  ),
  '/new-system-development': m(
    'New system development',
    'Custom new system development',
    'Need something that does not exist yet? I design and build custom web applications and business systems around how your organization works.',
  ),
  '/enhancement': m(
    'System enhancement',
    'System enhancement and modernization',
    'Add features, modernize the interface, speed up the database, and strengthen security on a system you already run, without a rebuild.',
  ),
  '/maintenance': m(
    'Maintenance',
    'System maintenance and bug fixing',
    'Troubleshooting, bug fixing, updates, and long-term maintenance for systems that need someone who knows them and stays responsible for them.',
  ),
  '/process': m(
    'Process',
    'How I work',
    'My seven-step process: understand, analyze, plan, build, test, deploy, and maintain, with clear communication at every stage.',
  ),
  '/technology': m(
    'Technology',
    'Technology stack',
    'The technologies behind my work, including React, TypeScript, Node.js, PostgreSQL, and PHP for modernizing legacy systems.',
  ),
  '/about': m(
    'About',
    'About me',
    'I am an independent software developer who builds, improves, fixes, and maintains systems for businesses and organizations.',
  ),
  '/faq': m(
    'FAQ',
    'Frequently asked questions',
    'Answers about starting a project, working on an existing system, system assessments, and what to prepare before we talk.',
  ),
  '/privacy': m(
    'Privacy',
    'Privacy policy (draft)',
    'How this site handles account information, cookies, and security data. Draft text pending legal review.',
  ),
  '/terms': m(
    'Terms',
    'Terms of use (draft)',
    'Terms for using this site and its client accounts. Draft text pending legal review.',
  ),
  '/contact': m(
    'Contact',
    'Contact and start a project',
    'Tell me what you need: a new system, help with an existing one, or an idea. Choose a path and send your request in a few minutes.',
  ),
  '/assessment': m(
    'System assessment',
    'Request a system assessment',
    'Describe your existing system and its problems, and I will review it and tell you what to fix, improve, or modernize first.',
  ),
  '/contact/new-system': m(
    'New system inquiry',
    'New system inquiry',
    'Tell me about the system you need built.',
    false,
  ),
  '/contact/existing-system': m(
    'Existing system inquiry',
    'Existing system inquiry',
    'Tell me about the system you already have.',
    false,
  ),
  '/contact/idea': m(
    'Idea inquiry',
    'Share your idea',
    'Describe your idea and we can work out the next step.',
    false,
  ),
  '/login': m('Sign in', 'Sign in', 'Sign in to your Solvexa client account.', false),
  '/register': m(
    'Create account',
    'Create an account',
    'Create a client account to send requests, message me, and track your projects.',
    false,
  ),
  '/forgot-password': m(
    'Forgot password',
    'Reset your password',
    'Request a password reset link for your account.',
    false,
  ),
  '/reset-password': m(
    'Reset password',
    'Choose a new password',
    'Set a new password for your Solvexa account.',
    false,
  ),
  '/verify-email': m(
    'Verify email',
    'Verify your email',
    'Confirm your email address to activate your account.',
    false,
  ),
  '/portal': m('Portal', 'Client portal', 'Your projects, requests, and support.', false),
  '/admin': m('Admin', 'Admin', 'Administration for Solvexa accounts and activity.', false),
  '/mfa': m('Two-factor', 'Two-factor verification', 'Verify your administrator session.', false),
  '/404': m('Not found', 'Page not found', 'That page does not exist.', false),
};

export function metaFor(path: string): RouteMeta {
  const hit = routeMeta[path];
  if (hit) return hit;
  if (path.startsWith('/admin')) return routeMeta['/admin']!;
  const slug = path.match(/^\/projects\/([\w-]+)$/)?.[1];
  const project = slug ? projects.find((p) => p.slug === slug) : undefined;
  if (project) {
    return m(
      project.name,
      `${project.name} case study`,
      project.summary || `Case study: ${project.name}. Problem, solution, technology, and verified results.`,
      !project.placeholder,
    );
  }
  return routeMeta['/404']!;
}

export const canonicalFor = (path: string) => new URL(path, siteConfig.siteUrl).toString();

export function breadcrumbsFor(path: string): { name: string; url: string }[] {
  if (path === '/' || (!routeMeta[path] && !path.startsWith('/projects/'))) return [];
  const crumbs = [{ name: 'Home', url: canonicalFor('/') }];
  if (path.startsWith('/projects/')) crumbs.push({ name: 'Projects', url: canonicalFor('/projects') });
  crumbs.push({ name: metaFor(path).label, url: canonicalFor(path) });
  return crumbs;
}

export function faqJsonLd(visible: Faq[]) {
  if (!visible.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: visible.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** JSON-LD for a path. Only facts that exist and are visible on the page: no invented ratings, addresses, or reviews. */
export function jsonLdFor(path: string, visibleFaqList: Faq[]): object[] {
  const out: object[] = [];
  const url = canonicalFor('/');
  if (path === '/') {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: base,
      url,
      description: routeMeta['/']!.description,
      serviceType: [
        'Custom software development',
        'Web application development',
        'System maintenance',
        'System modernization',
      ],
    });
    out.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: base, url });
  }
  const crumbs = breadcrumbsFor(path);
  if (crumbs.length) {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    });
  }
  if (path === '/faq') {
    const f = faqJsonLd(visibleFaqList);
    if (f) out.push(f);
  }
  return out;
}
