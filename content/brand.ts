export const HERO = {
  headline: 'Build. Improve. Maintain. Scale.',
  sub: 'Custom software solutions for businesses and organizations that need reliable systems, modern web applications, continuous improvements, and long-term technical support.',
} as const;

/** Core brand message. Shown in the hero area, in a dedicated section, and echoed in the final CTA. */
export const BRAND_LEAD = "You don't have to start from scratch.";
export const BRAND_LINES = [
  'If you need a new system, I can build it.',
  'If you already have one, I can improve it.',
  "If it's broken, I can troubleshoot it.",
  "If it's outdated, I can modernize it.",
  'If it needs new features, I can enhance it.',
  'And if you need someone to maintain it, I can keep it running.',
] as const;
export const BRAND_MESSAGE = [BRAND_LEAD, ...BRAND_LINES].join(' ');

export const ENTRY_PATHS = [
  {
    id: 'new',
    verb: 'Build',
    title: 'I need a new system',
    text: 'A custom system designed around how you actually work.',
    to: '/new-system-development',
  },
  {
    id: 'improve',
    verb: 'Improve',
    title: 'I want to improve what I have',
    text: 'Better design, new features, and modernization, without a rebuild.',
    to: '/enhancement',
  },
  {
    id: 'fix',
    verb: 'Maintain',
    title: 'Something is broken or needs care',
    text: 'Troubleshooting, fixes, updates, and keeping it running.',
    to: '/maintenance',
  },
  {
    id: 'support',
    verb: 'Secure',
    title: 'I need long-term support',
    text: 'Someone who knows your system and stays responsible for it.',
    to: '/maintenance#support-plans',
  },
] as const;

export const TRUST_STATEMENT = {
  title: 'Software that has to keep working',
  text: 'I work as an independent developer, so you talk to the person who designs, builds, and supports your system. I plan before I build, I test before I deploy, and I stay available after launch.',
} as const;

export const WHY_WORK_WITH_ME = [
  {
    title: 'Custom-built solutions',
    text: 'Built around your process, not a template you have to adapt to.',
  },
  {
    title: 'Clear communication',
    text: 'Plain language, regular updates, and no surprises about what is being done.',
  },
  { title: 'Practical development', text: 'I choose the simplest approach that solves the problem well.' },
  { title: 'Maintainable code', text: 'Readable, documented, and structured so it can be changed later.' },
  {
    title: 'Responsive support',
    text: 'Questions and problems get a real answer from the person who built it.',
  },
  { title: 'Continuous improvement', text: 'Systems should get better over time, not just survive.' },
  {
    title: 'Security-conscious development',
    text: 'Authentication, access control, and data handling are designed in from the start.',
  },
  { title: 'Long-term support', text: 'I can stay on after launch to maintain and extend what we built.' },
] as const;

export const HOW_I_WORK = [
  {
    title: 'Understand',
    text: 'I listen first: who uses the system, what hurts today, and what success looks like.',
  },
  {
    title: 'Analyze',
    text: 'I review what exists, such as screens, data, errors, and hosting, and find the real causes.',
  },
  { title: 'Plan', text: 'You get a scoped plan with priorities, so you can decide what to do first.' },
  { title: 'Build', text: 'I build in small steps you can see and react to, not one big reveal.' },
  {
    title: 'Test',
    text: 'I check that it works, handles bad input, and does not break what already worked.',
  },
  { title: 'Deploy', text: 'I release carefully, with a way back if something goes wrong.' },
  { title: 'Maintain', text: 'I keep it updated, fix issues, and improve it as your needs change.' },
] as const;
