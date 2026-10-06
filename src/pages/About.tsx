import { about } from '@content/about';
import { siteConfig } from '@content/site.config';
import { Container, PlaceholderBadge } from '@/components/ui/Feedback';
import { PageHero, Section } from '@/components/marketing/Section';
import { WhyWorkWithMe } from '@/components/marketing/Blocks';
import { Cta } from '@/components/marketing/Cta';

export default function About() {
  return (
    <>
      <PageHero title="About me" lead={about.intro}>
        <Cta id="start-conversation" />
      </PageHero>
      <Container className="max-w-prose space-y-4 pb-12 text-lg text-muted">
        {about.body.map((b) => (
          <p key={b}>{b}</p>
        ))}
      </Container>
      <Section id="principles" title="How I approach the work">
        <ul className="max-w-prose list-disc space-y-2 pl-5 text-muted">
          {about.principles.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Section>
      <Section id="why" title="Why work with me" raised>
        <WhyWorkWithMe />
      </Section>
      {!siteConfig.hidePlaceholders && (
        <Section id="details" title="Personal details">
          <p className="text-muted">
            Not provided yet <PlaceholderBadge />: {about.placeholders.join(', ')}.
          </p>
        </Section>
      )}
    </>
  );
}
