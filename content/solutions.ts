export const existingSystem = {
  title: 'Already have a system? I can improve it.',
  lead: 'Nothing needs to be rebuilt from scratch just because it has problems. I start by understanding what you have, then fix, improve, or modernize the parts that need it.',
  issues: [
    {
      title: 'Legacy PHP systems',
      text: 'Older PHP applications that still run your operations but are hard to change.',
    },
    { title: 'Broken apps', text: 'Features that fail, pages that error, or an app that stopped working.' },
    {
      title: 'Database problems',
      text: 'Slow queries, messy data, duplicate records, or a structure that has outgrown itself.',
    },
    { title: 'Slow performance', text: 'Pages that take too long to load or reports that time out.' },
    { title: 'Bugs', text: 'Recurring errors that previous fixes never fully solved.' },
    {
      title: 'Missing features',
      text: 'Things your team still does by hand because the system cannot do them.',
    },
    { title: 'Poor UI', text: 'Confusing or outdated screens that do not work well on phones.' },
    { title: 'Security issues', text: 'Weak access control, outdated components, or exposed data.' },
    {
      title: 'Hosting and deployment problems',
      text: 'Servers that are fragile, misconfigured, or hard to update.',
    },
    { title: 'Upgrades', text: 'Moving to current versions of languages, frameworks, and libraries.' },
  ],
} as const;

export const improvementSteps = [
  {
    title: 'Existing System',
    text: 'We start with what you already have: how it is used, what works, and what does not.',
  },
  {
    title: 'Assessment',
    text: 'I review the system, its errors, and its environment to understand its condition.',
  },
  {
    title: 'Technical Analysis',
    text: 'I look at code, data, and hosting to find the root causes behind the symptoms.',
  },
  {
    title: 'Improvement Plan',
    text: 'You get a prioritized plan: what to fix first, what to improve, and what can wait.',
  },
  {
    title: 'Development',
    text: 'I make the changes in small, reviewable steps instead of a risky big-bang rewrite.',
  },
  { title: 'Testing', text: 'I verify the changes and check that existing behavior was not broken.' },
  { title: 'Deployment', text: 'I release carefully, with a plan to roll back if something goes wrong.' },
  { title: 'Maintenance', text: 'I stay available to keep it updated, fix issues, and keep improving it.' },
] as const;

export const comparison = {
  caption: 'What modernization targets',
  rows: [
    {
      aspect: 'Interface',
      before: 'Outdated screens that are hard to use on a phone',
      after: 'Redesigned, responsive interface',
    },
    { aspect: 'Backend', before: 'Slow, hard-to-follow server code', after: 'Optimized backend' },
    { aspect: 'Database', before: 'Slow queries and untidy data', after: 'Improved, optimized database' },
    { aspect: 'Security', before: 'Weak access control and outdated components', after: 'Improved security' },
    { aspect: 'Reporting', before: 'Limited or manual reports', after: 'Better reporting' },
    {
      aspect: 'Maintainability',
      before: 'Hard to maintain and risky to change',
      after: 'Scalable architecture that can grow',
    },
  ],
} as const;
