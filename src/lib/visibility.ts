import { siteConfig } from '@content/site.config';
import { faqs, type Faq } from '@content/faqs';
import { projects, type Project } from '@content/projects';
import { testimonials, type Testimonial } from '@content/testimonials';

/** `hide` defaults to the site flag; passing it explicitly keeps these pure and testable. */
export const visibleProjects = (hide = siteConfig.hidePlaceholders, list: Project[] = projects) =>
  hide ? list.filter((p) => !p.placeholder) : list;
export const visibleFaqs = (hide = siteConfig.hidePlaceholders, list: Faq[] = faqs) =>
  hide ? list.filter((f) => !f.placeholder) : list;
/** Unverified testimonials are placeholders by definition and never shown in production. */
export const visibleTestimonials = (
  hide = siteConfig.hidePlaceholders,
  list: Testimonial[] = testimonials,
) => (hide ? list.filter((t) => t.verified) : list);
