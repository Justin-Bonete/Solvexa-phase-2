export type Layer = 'Frontend' | 'Backend' | 'Database' | 'Infrastructure' | 'Quality';
export type Tech = { name: string; layer: Layer; note: string };

/** Only technologies used on this site, plus PHP for legacy modernization (stated in the brief). */
export const technologies: Tech[] = [
  { name: 'React', layer: 'Frontend', note: 'Interactive interfaces' },
  { name: 'TypeScript', layer: 'Frontend', note: 'Type-safe code on both sides' },
  { name: 'Tailwind CSS', layer: 'Frontend', note: 'Consistent, responsive styling' },
  { name: 'Vite', layer: 'Frontend', note: 'Fast builds and code splitting' },
  { name: 'Node.js', layer: 'Backend', note: 'Server runtime' },
  { name: 'Fastify', layer: 'Backend', note: 'API framework' },
  { name: 'PHP', layer: 'Backend', note: 'Working with and modernizing legacy systems' },
  { name: 'PostgreSQL', layer: 'Database', note: 'Relational data with constraints and migrations' },
  { name: 'Vercel', layer: 'Infrastructure', note: 'Hosting for this site' },
  { name: 'Vitest', layer: 'Quality', note: 'Automated tests' },
  { name: 'Playwright', layer: 'Quality', note: 'Browser tests' },
];
export const layers: Layer[] = ['Frontend', 'Backend', 'Database', 'Infrastructure', 'Quality'];
