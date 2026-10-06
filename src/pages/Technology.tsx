import { PageHero, Section } from '@/components/marketing/Section';
import { TechGrid } from '@/components/marketing/Blocks';
import { Cta } from '@/components/marketing/Cta';

export default function Technology() {
  return (
    <>
      <PageHero
        title="Technology stack"
        lead="The tools behind this site, plus PHP, which I work with when modernizing legacy systems. The right stack for your project depends on what you already have."
      >
        <Cta id="consultation" />
      </PageHero>
      <Section id="stack" title="What I use">
        <TechGrid />
        <p className="mt-6 max-w-prose text-sm text-muted">
          Each case study lists the technology used on that project once the details are confirmed.
        </p>
      </Section>
    </>
  );
}
