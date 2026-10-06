import { CATEGORIES, type CategoryId, type Project } from '@content/projects';

export type CategoryFilter = CategoryId | 'all';
export type Filters = { q: string; category: CategoryFilter };

const labelOf = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

const haystack = (p: Project) =>
  [
    p.name,
    p.summary,
    p.problem,
    p.solution,
    p.role,
    ...p.features,
    ...Object.values(p.tech).flat(),
    ...p.categories.map(labelOf),
  ]
    .join(' ')
    .toLowerCase();

/** Every search word must match (AND). Category filter is exact. */
export function filterProjects(list: Project[], { q, category }: Filters): Project[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter(
    (p) =>
      (category === 'all' || p.categories.includes(category)) && terms.every((t) => haystack(p).includes(t)),
  );
}

export function categoryCounts(list: Project[]): { id: CategoryId; label: string; count: number }[] {
  return CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    count: list.filter((p) => p.categories.includes(c.id)).length,
  })).filter((c) => c.count > 0);
}

export function parseFilters(params: URLSearchParams): Filters {
  const cat = params.get('category');
  const valid = CATEGORIES.some((c) => c.id === cat);
  return { q: (params.get('q') ?? '').slice(0, 100), category: valid ? (cat as CategoryId) : 'all' };
}
