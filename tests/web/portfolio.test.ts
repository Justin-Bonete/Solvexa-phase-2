import { describe, expect, it } from 'vitest';
import type { Project } from '@content/projects';
import { projects } from '@content/projects';
import { categoryCounts, filterProjects, parseFilters } from '@/lib/portfolio';

const mk = (o: Partial<Project>): Project => ({ ...(projects[0] as Project), placeholder: false, ...o });
const list = [
  mk({
    slug: 'a',
    name: 'Stock Tracker',
    categories: ['inventory', 'business-systems'],
    summary: 'Tracks stock levels',
    tech: { frontend: ['React'], backend: ['Node.js'], database: ['PostgreSQL'], infrastructure: [] },
  }),
  mk({
    slug: 'b',
    name: 'School Grades',
    categories: ['academic-systems'],
    summary: 'Students view grades',
    tech: { frontend: [], backend: ['PHP'], database: ['MySQL'], infrastructure: [] },
  }),
  mk({ slug: 'c', name: 'Shop Front', categories: ['e-commerce', 'websites'], summary: 'Online store' }),
];

describe('filterProjects', () => {
  it('returns everything for an empty query and "all"', () =>
    expect(filterProjects(list, { q: '', category: 'all' })).toHaveLength(3));
  it('filters by exact category (including multi-category projects)', () => {
    expect(filterProjects(list, { q: '', category: 'inventory' }).map((p) => p.slug)).toEqual(['a']);
    expect(filterProjects(list, { q: '', category: 'websites' }).map((p) => p.slug)).toEqual(['c']);
  });
  it('searches name, summary, technology and category labels, case-insensitively', () => {
    expect(filterProjects(list, { q: 'stock', category: 'all' })).toHaveLength(1);
    expect(filterProjects(list, { q: 'PHP', category: 'all' }).map((p) => p.slug)).toEqual(['b']);
    expect(filterProjects(list, { q: 'academic', category: 'all' }).map((p) => p.slug)).toEqual(['b']);
  });
  it('requires every word to match, and combines search with category', () => {
    expect(filterProjects(list, { q: 'react postgresql', category: 'all' })).toHaveLength(1);
    expect(filterProjects(list, { q: 'react php', category: 'all' })).toHaveLength(0);
    expect(filterProjects(list, { q: 'stock', category: 'academic-systems' })).toHaveLength(0);
  });
  it('returns an empty list (not an error) when nothing matches', () =>
    expect(filterProjects(list, { q: 'zzzz', category: 'all' })).toEqual([]));
});

describe('categoryCounts and parseFilters', () => {
  it('lists only categories that have projects', () => {
    const c = categoryCounts(list);
    expect(c.map((x) => x.id)).toContain('inventory');
    expect(c.every((x) => x.count > 0)).toBe(true);
    expect(c.find((x) => x.id === 'pos')).toBeUndefined();
  });
  it('ignores unknown categories and caps query length', () => {
    expect(parseFilters(new URLSearchParams('category=bogus&q=x')).category).toBe('all');
    expect(parseFilters(new URLSearchParams(`q=${'a'.repeat(500)}`)).q).toHaveLength(100);
    expect(parseFilters(new URLSearchParams('category=pos')).category).toBe('pos');
  });
});
