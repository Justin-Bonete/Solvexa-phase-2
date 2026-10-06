import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { deployStatusLabel, devStatusLabel, type Project } from '@content/projects';
import { Badge, Container, PlaceholderBadge } from '@/components/ui/Feedback';
import { Cta } from '@/components/marketing/Cta';
import { categoryLabel } from '@/components/marketing/Cards';
import { buttonClass } from '@/components/ui/Button';
import { visibleProjects } from '@/lib/visibility';
import NotFound from './NotFound';

const NONE = 'Not yet provided.';

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="border-t border-line py-10">
      <h2 id={`${id}-h`} className="text-h3">
        {title}
      </h2>
      <div className="mt-4 max-w-prose text-muted">{children}</div>
    </section>
  );
}
const Text = ({ v }: { v: string }) => <p>{v || NONE}</p>;
const List = ({ v }: { v: string[] }) =>
  v.length ? (
    <ul className="list-disc space-y-1.5 pl-5">
      {v.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  ) : (
    <p>{NONE}</p>
  );

export function CaseStudy({ p }: { p: Project }) {
  const tech = Object.entries(p.tech) as [keyof Project['tech'], string[]][];
  return (
    <Container className="py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link className="hover:text-fg" to="/projects">
          Projects
        </Link>{' '}
        <span aria-hidden>/</span> <span aria-current="page">{p.name}</span>
      </nav>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {p.placeholder && <PlaceholderBadge />}
        {p.categories.map((c) => (
          <Badge key={c}>{categoryLabel(c)}</Badge>
        ))}
      </div>
      <h1 className="mt-3 max-w-3xl text-h1">{p.name}</h1>
      <Block id="overview" title="Overview">
        <Text v={p.summary} />
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-faint">My role</dt>
            <dd className="text-fg">{p.role || 'To be confirmed'}</dd>
          </div>
          <div>
            <dt className="text-faint">Development</dt>
            <dd className="text-fg">{devStatusLabel[p.devStatus]}</dd>
          </div>
          <div>
            <dt className="text-faint">Deployment</dt>
            <dd className="text-fg">{deployStatusLabel[p.deployStatus]}</dd>
          </div>
        </dl>
      </Block>
      <Block id="problem" title="Problem">
        <Text v={p.problem} />
      </Block>
      <Block id="solution" title="Solution">
        <Text v={p.solution} />
      </Block>
      <Block id="features" title="Key features">
        <List v={p.features} />
      </Block>
      <Block id="technology" title="Technology">
        <dl className="grid gap-4 sm:grid-cols-2">
          {tech.map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm capitalize text-faint">{k}</dt>
              <dd className="text-fg">{v.length ? v.join(', ') : 'To be confirmed'}</dd>
            </div>
          ))}
        </dl>
      </Block>
      <Block id="architecture" title="Architecture">
        <Text v={p.architecture} />
        {p.screenshots.length === 0 && (
          <p className="mt-3 text-sm text-faint">Screenshots have not been provided yet.</p>
        )}
      </Block>
      <Block id="challenges" title="Challenges">
        <List v={p.challenges} />
      </Block>
      <Block id="process" title="Development process">
        <List v={p.developmentProcess} />
      </Block>
      <Block id="results" title="Results">
        {p.results && p.results.length ? <List v={p.results} /> : <p>Not yet measured.</p>}
      </Block>
      <Block id="lessons" title="Lessons learned">
        <Text v={p.lessons} />
      </Block>
      <div className="flex flex-wrap items-start gap-4 border-t border-line pt-10">
        <Cta id="need-similar" />
        <Link to="/projects" className={buttonClass('secondary')}>
          Back to all projects
        </Link>
      </div>
    </Container>
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const p = visibleProjects().find((x) => x.slug === slug);
  return p ? <CaseStudy p={p} /> : <NotFound />;
}
