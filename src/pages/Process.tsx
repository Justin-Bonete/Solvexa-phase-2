import { PageHero, Section } from '@/components/marketing/Section';
import { HowIWorkSteps } from '@/components/marketing/Blocks';
import { ProcessVisual } from '@/components/marketing/ProcessVisual';
import { improvementSteps } from '@content/solutions';
import { Cta } from '@/components/marketing/Cta';

export default function Process() {
  return (
    <>
      <PageHero
        title="How I work"
        lead="A simple process: understand, analyze, plan, build, test, deploy, and maintain."
      >
        <Cta id="start-project" />
      </PageHero>
      <Section id="steps" title="Seven steps">
        <HowIWorkSteps />
      </Section>
      <Section
        id="existing"
        title="When you already have a system"
        lead="The same approach, adapted for improving something that exists."
        raised
      >
        <ProcessVisual steps={improvementSteps} label="How I improve an existing system" />
      </Section>
    </>
  );
}
