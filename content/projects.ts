export const CATEGORIES = [
  { id: 'business-systems', label: 'Business Systems' },
  { id: 'web-applications', label: 'Web Applications' },
  { id: 'websites', label: 'Websites' },
  { id: 'management-systems', label: 'Management Systems' },
  { id: 'e-commerce', label: 'E-Commerce' },
  { id: 'pos', label: 'POS' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'academic-systems', label: 'Academic Systems' },
  { id: 'government-organizational', label: 'Government/Organizational Systems' },
  { id: 'experimental', label: 'Experimental' },
  { id: 'open-source', label: 'Open Source' },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]['id'];

export type DevStatus = 'in_development' | 'completed' | 'maintained' | 'prototype' | 'unspecified';
export type DeployStatus = 'live' | 'internal' | 'demo' | 'not_deployed' | 'unspecified';

export type Project = {
  slug: string;
  name: string;
  categories: CategoryId[];
  summary: string;
  problem: string;
  solution: string;
  features: string[];
  tech: { frontend: string[]; backend: string[]; database: string[]; infrastructure: string[] };
  role: string;
  devStatus: DevStatus;
  deployStatus: DeployStatus;
  screenshots: { src: string; alt: string }[];
  architecture: string;
  challenges: string[];
  developmentProcess: string[];
  /** Verified results only. `null` renders "Not yet measured". Never put estimates here. */
  results: string[] | null;
  lessons: string;
  /** true = details are unverified; hidden in production when hidePlaceholders is on. */
  placeholder: boolean;
  featured: boolean;
};

const empty = { frontend: [], backend: [], database: [], infrastructure: [] };
/** Only the project NAME is supplied so far. Every other field stays empty rather than guessed. */
const seed = (slug: string, name: string, categories: CategoryId[], featured = true): Project => ({
  slug,
  name,
  categories,
  summary: '',
  problem: '',
  solution: '',
  features: [],
  tech: empty,
  role: '',
  devStatus: 'unspecified',
  deployStatus: 'unspecified',
  screenshots: [],
  architecture: '',
  challenges: [],
  developmentProcess: [],
  results: null,
  lessons: '',
  placeholder: true,
  featured,
});

export const projects: Project[] = [
  seed('smart-inventory-pos-system', 'Smart Inventory & POS System', [
    'pos',
    'inventory',
    'business-systems',
  ]),
  seed('online-grading-viewer-system', 'Online Grading Viewer System', [
    'academic-systems',
    'web-applications',
  ]),
  seed('labor-assistance-beneficiary-management-system', 'Labor Assistance & Beneficiary Management System', [
    'government-organizational',
    'management-systems',
  ]),
  seed('dole-rwa-system', 'DOLE RWA System', ['government-organizational'], false),
  seed('developer-portfolio', 'Developer Portfolio', ['websites'], false),
];

export const devStatusLabel: Record<DevStatus, string> = {
  in_development: 'In development',
  completed: 'Completed',
  maintained: 'Maintained',
  prototype: 'Prototype',
  unspecified: 'To be confirmed',
};
export const deployStatusLabel: Record<DeployStatus, string> = {
  live: 'Live',
  internal: 'Internal use',
  demo: 'Demo',
  not_deployed: 'Not deployed',
  unspecified: 'To be confirmed',
};
