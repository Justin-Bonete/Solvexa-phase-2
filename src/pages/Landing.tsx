import { landings, type Landing } from '@content/landing';
import { Container, PlaceholderBadge } from '@/components/ui/Feedback';
import { PageHero, Section } from '@/components/marketing/Section';
import { Cta } from '@/components/marketing/Cta';
import { siteConfig } from '@content/site.config';

function LandingPage({ l }: { l: Landing }) {
  const showNote = l.supportNote && !(siteConfig.hidePlaceholders && l.supportNote.placeholder);
  return (
    <>
      <PageHero title={l.title} lead={l.lead} verb={l.verb}>
        <Cta id={l.cta} />
        <Cta id={l.secondaryCta} variant="secondary" />
      </PageHero>
      <Section id="included" title="What this includes">
        <ul className="grid gap-4 md:grid-cols-2">
          {l.includes.map((i) => (
            <li key={i.title} className="rounded-lg border border-line bg-s1 p-5">
              <h3 className="font-semibold">{i.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{i.text}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="fits" title="This is for you if" raised>
        <ul className="max-w-prose list-disc space-y-2 pl-5 text-muted">
          {l.fitsWhen.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </Section>
      <Section id="steps" title="How it works">
        <ol className="grid gap-4 md:grid-cols-4">
          {l.steps.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-line bg-s1 p-5">
              <span aria-hidden className="font-mono text-sm text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>
      {showNote && l.supportNote && (
        <Section id={l.supportNote.id} title={l.supportNote.title} raised>
          <p className="max-w-prose text-muted">
            {l.supportNote.text} {l.supportNote.placeholder && <PlaceholderBadge />}
          </p>
        </Section>
      )}
      <Container className="pb-4">
        <div className="flex flex-wrap items-start gap-4 border-t border-line pt-10">
          <Cta id={l.cta} />
          <Cta id={l.secondaryCta} variant="secondary" />
        </div>
      </Container>
    </>
  );
}
const by = (slug: Landing['slug']) => landings.find((l) => l.slug === slug) as Landing;
export const NewSystem = () => <LandingPage l={by('new-system-development')} />;
export const Enhancement = () => <LandingPage l={by('enhancement')} />;
export const Maintenance = () => <LandingPage l={by('maintenance')} />;
