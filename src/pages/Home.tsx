import { Link } from 'react-router-dom';
import { BRAND_LEAD, ENTRY_PATHS, HERO, TRUST_STATEMENT, BRAND_LINES } from '@content/brand';
import { services } from '@content/services';
import { existingSystem, improvementSteps } from '@content/solutions';
import { Container } from '@/components/ui/Feedback';
import { buttonClass } from '@/components/ui/Button';
import { Cta } from '@/components/marketing/Cta';
import { Section, Reveal } from '@/components/marketing/Section';
import { ProjectCard, ServiceTile } from '@/components/marketing/Cards';
import { ProcessVisual } from '@/components/marketing/ProcessVisual';
import {
  BrandMessage,
  CompareTable,
  ContactPaths,
  FaqList,
  HowIWorkSteps,
  TechGrid,
  TestimonialCards,
  WhyWorkWithMe,
} from '@/components/marketing/Blocks';
import { visibleFaqs, visibleProjects, visibleTestimonials } from '@/lib/visibility';

export default function Home() {
  const featured = visibleProjects()
    .filter((p) => p.featured)
    .slice(0, 3);
  const caseStudy = visibleProjects()[0];
  const testimonials = visibleTestimonials();
  const faqs = visibleFaqs().slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(var(--c-accent)/0.12),transparent)]"
        />
        <Container className="relative py-16 sm:py-24">
          <p className="text-sm text-muted">Software Development &amp; Technical Solutions</p>
          <h1 className="mt-5 max-w-4xl text-display">{HERO.headline}</h1>
          <p className="mt-6 max-w-prose text-lg text-muted">{HERO.sub}</p>
          <div className="mt-9 flex flex-wrap items-start gap-x-4 gap-y-6">
            <Cta id="start-project" />
            <Cta id="view-work" variant="secondary" />
            <Cta id="existing-system" variant="tertiary" />
          </div>
          <p className="mt-10 max-w-prose border-l-2 border-accent pl-4 text-muted">
            <span className="text-fg">{BRAND_LEAD}</span> {BRAND_LINES[1]}
          </p>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {ENTRY_PATHS.map((p) => (
              <li key={p.id}>
                <Link
                  to={p.to}
                  className="group block h-full rounded-lg border border-line bg-s1 p-5 transition-colors hover:border-line-strong hover:bg-s2"
                >
                  <span className="text-sm font-medium text-accent">{p.verb}</span>
                  <span className="mt-1 block font-semibold group-hover:underline">{p.title}</span>
                  <span className="mt-2 block text-sm text-muted">{p.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Section id="why" title={TRUST_STATEMENT.title} lead={TRUST_STATEMENT.text}>
        <WhyWorkWithMe />
      </Section>

      <section id="message" aria-label="My approach" className="border-t border-line bg-s1/50">
        <Container className="py-20 sm:py-28">
          <Reveal>
            <BrandMessage />
          </Reveal>
        </Container>
      </section>

      <Section
        id="services"
        title="What I can do for you"
        lead="Twelve ways I help, from building something new to keeping an existing system healthy."
      >
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {services.map((s) => (
            <li key={s.id}>
              <ServiceTile s={s} />
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Link to="/services" className={buttonClass('secondary')}>
            See all services
          </Link>
        </div>
      </Section>

      <Section id="existing" title={existingSystem.title} lead={existingSystem.lead} raised>
        <ul className="mb-12 flex flex-wrap gap-2">
          {existingSystem.issues.map((i) => (
            <li
              key={i.title}
              className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-muted"
            >
              {i.title}
            </li>
          ))}
        </ul>
        <ProcessVisual steps={improvementSteps} label="How I improve an existing system" />
        <div className="mt-8 flex flex-wrap items-start gap-4">
          <Cta id="request-assessment" />
          <Link to="/solutions" className={buttonClass('tertiary')}>
            Read more about improving existing systems
          </Link>
        </div>
      </Section>

      <Section
        id="solutions"
        title="What modernization changes"
        lead="A typical outdated system compared with the same system after modernization."
      >
        <CompareTable />
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['/new-system-development', 'Build a new system'],
            ['/enhancement', 'Improve and modernize'],
            ['/maintenance', 'Fix and maintain'],
          ].map(([to, label]) => (
            <li key={to}>
              <Link to={to as string} className={buttonClass('secondary', 'w-full')}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {featured.length > 0 && (
        <Section id="featured" title="Featured projects" lead="A selection of the systems I have worked on.">
          <ul className="grid gap-4 md:grid-cols-3">
            {featured.map((p) => (
              <li key={p.slug}>
                <ProjectCard p={p} />
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Cta id="view-work" variant="secondary" />
          </div>
        </Section>
      )}

      {caseStudy && (
        <Section
          id="case-studies"
          title="Case studies"
          lead="Each case study covers the problem, the solution, the technology, and what actually resulted, with only verified results."
        >
          <div className="flex flex-wrap items-center gap-4">
            <p className="font-medium">{caseStudy.name}</p>
            <Cta id="view-case-study" variant="secondary" to={`/projects/${caseStudy.slug}`} />
          </div>
        </Section>
      )}

      <Section
        id="technology"
        title="Technology I work with"
        lead="The tools behind this site and my work, chosen for reliability and maintainability."
        raised
      >
        <TechGrid />
      </Section>

      <Section
        id="process"
        title="How I work"
        lead="A simple, repeatable process so you always know what is happening and what comes next."
      >
        <HowIWorkSteps />
        <div className="mt-8">
          <Link to="/process" className={buttonClass('secondary')}>
            More about my process
          </Link>
        </div>
      </Section>

      <Section
        id="maintenance"
        title="Keeping systems running"
        lead="Launching is not the finish line. I can stay on to troubleshoot, update, and improve your system for the long term."
        raised
      >
        <div className="flex flex-wrap items-start gap-4">
          <Link to="/maintenance" className={buttonClass('primary')}>
            System maintenance
          </Link>
          <Cta id="technical-support" variant="secondary" />
        </div>
      </Section>

      {testimonials.length > 0 && (
        <Section
          id="testimonials"
          title="What clients say"
          lead={
            testimonials.some((t) => !t.verified)
              ? 'Placeholder content. Real testimonials will replace these.'
              : undefined
          }
        >
          <TestimonialCards items={testimonials} />
        </Section>
      )}

      {faqs.length > 0 && (
        <Section id="faq" title="Frequently asked questions">
          <FaqList items={faqs} />
          <div className="mt-8">
            <Link to="/faq" className={buttonClass('tertiary')}>
              See all questions
            </Link>
          </div>
        </Section>
      )}

      <section id="start" aria-labelledby="start-h" className="border-t border-line bg-s1/50">
        <Container className="py-20 sm:py-24">
          <h2 id="start-h" className="max-w-3xl text-h1">
            {BRAND_LEAD}
          </h2>
          <p className="mt-5 max-w-prose text-lg text-muted">{BRAND_LINES[5]}</p>
          <div className="mt-8 flex flex-wrap items-start gap-x-4 gap-y-6">
            <Cta id="start-project" />
            <Cta id="consultation" variant="secondary" />
          </div>
        </Container>
      </section>

      <Section id="contact" title="Get in touch" lead="Choose the path that fits where you are.">
        <ContactPaths />
      </Section>
    </>
  );
}
