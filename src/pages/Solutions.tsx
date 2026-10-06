import { existingSystem, improvementSteps } from '@content/solutions';
import { Container } from '@/components/ui/Feedback';
import { PageHero, Section } from '@/components/marketing/Section';
import { ProcessVisual } from '@/components/marketing/ProcessVisual';
import { CompareTable } from '@/components/marketing/Blocks';
import { Cta } from '@/components/marketing/Cta';

export default function Solutions() {
  return (
    <>
      <PageHero title={existingSystem.title} lead={existingSystem.lead} verb="Improve">
        <Cta id="request-assessment" />
        <Cta id="improve-existing" variant="secondary" />
      </PageHero>
      <Section id="problems" title="Problems I can help with">
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {existingSystem.issues.map((i) => (
            <li key={i.title} className="rounded-lg border border-line bg-s1 p-5">
              <h3 className="font-semibold">{i.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{i.text}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="how" title="How an improvement works" raised>
        <ProcessVisual steps={improvementSteps} label="How I improve an existing system" />
      </Section>
      <Section id="compare" title="Outdated vs. modernized" lead="What modernization aims to change.">
        <CompareTable />
      </Section>
      <Container className="pb-4">
        <div className="flex flex-wrap items-start gap-4 border-t border-line pt-10">
          <Cta id="request-assessment" />
          <Cta id="discuss-project" variant="secondary" />
        </div>
      </Container>
    </>
  );
}
