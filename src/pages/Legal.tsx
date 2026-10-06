import { privacy, terms, type LegalDoc } from '@content/legal';
import { siteConfig } from '@content/site.config';
import { Alert, Container, PlaceholderBadge } from '@/components/ui/Feedback';

function Doc({ doc }: { doc: LegalDoc }) {
  const showTodos = !siteConfig.hidePlaceholders;
  const sections = doc.sections.filter((s) => s.body.length > 0 || (showTodos && s.todo?.length));
  return (
    <Container className="max-w-3xl py-12">
      <h1 className="text-h1">{doc.title}</h1>
      <div className="mt-6">
        <Alert tone="warning" title="Draft: needs legal review">
          This is a draft template. It describes what the site does today and has not been reviewed by a
          lawyer.
        </Alert>
      </div>
      {sections.map((s) => (
        <section key={s.heading} className="mt-10">
          <h2 className="text-h3">{s.heading}</h2>
          <div className="mt-3 space-y-3 text-muted">
            {s.body.map((b) => (
              <p key={b}>{b}</p>
            ))}
            {showTodos &&
              s.todo?.map((t) => (
                <p key={t}>
                  <PlaceholderBadge /> To do: {t}
                </p>
              ))}
          </div>
        </section>
      ))}
    </Container>
  );
}

export const Privacy = () => <Doc doc={privacy} />;
export const Terms = () => <Doc doc={terms} />;
