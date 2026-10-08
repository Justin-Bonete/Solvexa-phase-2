import { AssessmentForm } from '@/features/intake/AssessmentForm';
import { PageHero } from '@/components/marketing/Section';
import { Container } from '@/components/ui/Feedback';

export default function Assessment() {
  return (
    <>
      <PageHero
        title="Request a system assessment"
        lead="Describe the system you have and what is going wrong. I review it and tell you what I would fix, improve, or modernize first."
        verb="Improve"
      />
      <Container className="max-w-3xl pb-8">
        <AssessmentForm />
      </Container>
    </>
  );
}
