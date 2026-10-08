import { Link } from 'react-router-dom';
import { siteConfig, visible } from '@content/site.config';
import { Container } from '@/components/ui/Feedback';
import { PageHero } from '@/components/marketing/Section';

const paths = [
  {
    to: '/contact/new-system',
    title: 'I need a new system',
    text: 'A new web application, business system, or website designed around how you work.',
  },
  {
    to: '/contact/existing-system',
    title: 'I already have a system',
    text: 'Maintenance, troubleshooting, modernization, or new features for something that already exists.',
  },
  {
    to: '/contact/idea',
    title: 'I have an idea',
    text: 'Not sure what you need yet? Describe the idea and we can work out the next step.',
  },
];

export default function Contact() {
  const email = visible(siteConfig.contact.email);
  return (
    <>
      <PageHero
        title="Tell me what you need"
        lead="Choose the path that fits where you are. Each one asks only the questions that matter for it."
      />
      <Container className="pb-8">
        <ul className="grid gap-4 md:grid-cols-3">
          {paths.map((p) => (
            <li key={p.to}>
              <Link
                to={p.to}
                className="group flex h-full flex-col rounded-lg border border-line bg-s1 p-6 transition-colors hover:border-line-strong hover:bg-s2"
              >
                <span className="text-h3 group-hover:underline">{p.title}</span>
                <span className="mt-2 text-muted">{p.text}</span>
                <span className="mt-auto pt-6 text-sm text-accent">Start this form</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 grid gap-6 border-t border-line pt-10 md:grid-cols-2">
          <div>
            <h2 className="text-h3">Want a technical review first?</h2>
            <p className="mt-2 max-w-prose text-muted">
              If your system has specific problems, the system assessment form lets you describe it in detail,
              including errors and what access you have.
            </p>
            <Link
              to="/assessment"
              className="mt-4 inline-block text-accent underline-offset-4 hover:underline"
            >
              Open the system assessment form
            </Link>
          </div>
          <div>
            <h2 className="text-h3">What happens next</h2>
            <p className="mt-2 max-w-prose text-muted">
              Your request is saved the moment you send it and you get a reference number. I read every
              request myself and reply to the email address you provide.
            </p>
            {email && (
              <p className="mt-4 text-sm text-muted">
                Prefer email?{' '}
                <a className="text-accent hover:underline" href={`mailto:${email}`}>
                  {email}
                </a>
              </p>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
