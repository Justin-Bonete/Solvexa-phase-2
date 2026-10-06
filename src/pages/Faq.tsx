import { Container } from '@/components/ui/Feedback';
import { PageHero } from '@/components/marketing/Section';
import { FaqList } from '@/components/marketing/Blocks';
import { Cta } from '@/components/marketing/Cta';
import { visibleFaqs } from '@/lib/visibility';

export default function Faq() {
  return (
    <>
      <PageHero
        title="Frequently asked questions"
        lead="Common questions about starting a project and working on an existing system."
      >
        <Cta id="start-conversation" />
      </PageHero>
      <Container className="pb-8">
        <div className="max-w-3xl">
          <FaqList items={visibleFaqs()} />
        </div>
      </Container>
    </>
  );
}
