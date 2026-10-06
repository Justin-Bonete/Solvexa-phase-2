import { useSearchParams } from 'react-router-dom';
import { Container, EmptyState } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { PageHero } from '@/components/marketing/Section';
import { ProjectCard } from '@/components/marketing/Cards';
import { categoryCounts, filterProjects, parseFilters } from '@/lib/portfolio';
import { visibleProjects } from '@/lib/visibility';

export default function Projects() {
  const [params, setParams] = useSearchParams();
  const all = visibleProjects();
  const filters = parseFilters(params);
  const results = filterProjects(all, filters);
  const cats = categoryCounts(all);

  const update = (next: Partial<typeof filters>) => {
    const f = { ...filters, ...next };
    const p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    if (f.category !== 'all') p.set('category', f.category);
    setParams(p, { replace: true });
  };

  return (
    <>
      <PageHero
        title="Projects and case studies"
        lead="Systems I have worked on. Each case study shows the problem, the solution, the technology, and only verified results."
      />
      <Container className="pb-8">
        {all.length === 0 ? (
          <EmptyState title="Case studies are being prepared">
            I am putting together detailed case studies with verified information. Check back soon, or get in
            touch to hear about relevant work.
          </EmptyState>
        ) : (
          <>
            <div role="search" className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-sm">
                <label htmlFor="project-search" className="mb-1.5 block text-sm font-medium">
                  Search projects
                </label>
                <Input
                  id="project-search"
                  type="search"
                  value={filters.q}
                  onChange={(e) => update({ q: e.target.value })}
                  placeholder="Name, technology, or category"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              <Button
                variant={filters.category === 'all' ? 'primary' : 'secondary'}
                aria-pressed={filters.category === 'all'}
                onClick={() => update({ category: 'all' })}
              >
                All
              </Button>
              {cats.map((c) => (
                <Button
                  key={c.id}
                  variant={filters.category === c.id ? 'primary' : 'secondary'}
                  aria-pressed={filters.category === c.id}
                  onClick={() => update({ category: c.id })}
                >
                  {c.label} ({c.count})
                </Button>
              ))}
            </div>
            <p role="status" aria-live="polite" className="mt-6 text-sm text-muted">
              {results.length} {results.length === 1 ? 'project' : 'projects'}
            </p>
            {results.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No projects match"
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => setParams(new URLSearchParams(), { replace: true })}
                    >
                      Clear filters
                    </Button>
                  }
                >
                  Try a different search or category.
                </EmptyState>
              </div>
            ) : (
              <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.map((p) => (
                  <li key={p.slug}>
                    <ProjectCard p={p} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Container>
    </>
  );
}
