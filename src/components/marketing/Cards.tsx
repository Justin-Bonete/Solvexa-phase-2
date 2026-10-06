import { Link } from 'react-router-dom';
import { CATEGORIES, deployStatusLabel, devStatusLabel, type Project } from '@content/projects';
import type { Service } from '@content/services';
import { Badge, Card, PlaceholderBadge } from '@/components/ui/Feedback';
import { Cta } from './Cta';

export function ServiceTile({ s }: { s: Service }) {
  return (
    <Link
      to={`/services#${s.id}`}
      className="group block h-full rounded-lg border border-line bg-s1 p-5 transition-colors hover:border-line-strong hover:bg-s2"
    >
      <p className="text-xs font-medium text-accent">{s.verb}</p>
      <h3 className="mt-1 text-lg font-semibold group-hover:underline">{s.title}</h3>
      <p className="mt-2 text-sm text-muted">{s.summary}</p>
    </Link>
  );
}

export function ServiceCard({ s }: { s: Service }) {
  return (
    <article
      id={s.id}
      aria-labelledby={`${s.id}-h`}
      className="flex h-full flex-col rounded-lg border border-line bg-s1 p-6"
    >
      <p className="text-xs font-medium text-accent">{s.verb}</p>
      <h2 id={`${s.id}-h`} className="mt-1 text-h3">
        {s.title}
      </h2>
      <p className="mt-3 text-muted">{s.summary}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-muted">
        {s.points.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <Cta id={s.cta} variant="secondary" />
      </div>
    </article>
  );
}

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export function ProjectCard({ p }: { p: Project }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2">
        {p.placeholder && <PlaceholderBadge />}
        {p.categories.map((c) => (
          <Badge key={c}>{categoryLabel(c)}</Badge>
        ))}
      </div>
      <h3 className="mt-3 text-h3">
        <Link to={`/projects/${p.slug}`} className="hover:underline">
          {p.name}
        </Link>
      </h3>
      <p className="mt-2 text-sm text-muted">
        {p.summary || 'Details for this project have not been provided yet.'}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-faint">Development</dt>
          <dd>{devStatusLabel[p.devStatus]}</dd>
        </div>
        <div>
          <dt className="text-faint">Deployment</dt>
          <dd>{deployStatusLabel[p.deployStatus]}</dd>
        </div>
      </dl>
      <div className="mt-auto pt-5">
        <Link to={`/projects/${p.slug}`} className="text-sm text-accent underline-offset-4 hover:underline">
          View case study<span className="sr-only">: {p.name}</span>
        </Link>
      </div>
    </Card>
  );
}
