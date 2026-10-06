import { services } from '@content/services';
import { Container } from '@/components/ui/Feedback';
import { PageHero } from '@/components/marketing/Section';
import { ServiceCard } from '@/components/marketing/Cards';
import { Cta } from '@/components/marketing/Cta';

export default function Services() {
  return (
    <>
      <PageHero
        title="Software development services"
        lead="Twelve services covering building, improving, maintaining, modernizing, securing, and scaling software."
      >
        <Cta id="discuss-project" />
      </PageHero>
      <Container className="pb-8">
        <ul className="grid gap-4 md:grid-cols-2">
          {services.map((s) => (
            <li key={s.id}>
              <ServiceCard s={s} />
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
