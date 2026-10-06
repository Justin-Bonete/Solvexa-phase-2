import type { CtaId } from './cta';

export type Verb = 'Build' | 'Improve' | 'Maintain' | 'Modernize' | 'Secure' | 'Scale';
export type Service = {
  id: string;
  title: string;
  verb: Verb;
  summary: string;
  points: string[];
  cta: CtaId;
};

/** 12 services. `id` is the anchor on /services (e.g. /services#system-maintenance). */
export const services: Service[] = [
  {
    id: 'custom-software',
    title: 'Custom Software Development',
    verb: 'Build',
    summary: 'Software designed around how your organization works, from first requirements to deployment.',
    points: ['Requirements and scoping', 'Design and development', 'Testing and release'],
    cta: 'start-project',
  },
  {
    id: 'web-applications',
    title: 'Web Application Development',
    verb: 'Build',
    summary: 'Modern, responsive web applications that people can use on any device.',
    points: ['Accounts and permissions', 'Dashboards and workflows', 'Responsive, accessible interfaces'],
    cta: 'discuss-project',
  },
  {
    id: 'business-systems',
    title: 'Business Systems',
    verb: 'Build',
    summary:
      'Inventory, POS, management, reporting, employee, and customer systems for day-to-day operations.',
    points: ['Inventory and point of sale', 'Management and reporting', 'Employee and customer records'],
    cta: 'tell-me',
  },
  {
    id: 'system-maintenance',
    title: 'System Maintenance',
    verb: 'Maintain',
    summary: 'Ongoing care so your system stays updated, stable, and working.',
    points: ['Updates and patches', 'Monitoring and backups', 'Issue handling'],
    cta: 'technical-support',
  },
  {
    id: 'system-enhancement',
    title: 'System Enhancement',
    verb: 'Improve',
    summary: 'New features and improvements added to a system you already run.',
    points: ['New modules and features', 'Workflow improvements', 'Better reporting'],
    cta: 'improve-existing',
  },
  {
    id: 'bug-fixing',
    title: 'Bug Fixing & Troubleshooting',
    verb: 'Maintain',
    summary: 'Finding the real cause of errors and failures, and fixing them properly.',
    points: ['Error diagnosis', 'Root-cause fixes', 'Regression checks'],
    cta: 'technical-support',
  },
  {
    id: 'database-development',
    title: 'Database Development',
    verb: 'Scale',
    summary: 'Database design, cleanup, and optimization so your data stays correct and fast.',
    points: ['Schema design', 'Query and index tuning', 'Migration and cleanup'],
    cta: 'discuss-project',
  },
  {
    id: 'api-integration',
    title: 'API & Integration',
    verb: 'Scale',
    summary: 'Connect your system to other services, tools, and data sources.',
    points: ['REST API design', 'Third-party integrations', 'Data import and export'],
    cta: 'discuss-project',
  },
  {
    id: 'ui-ux-modernization',
    title: 'UI/UX Modernization',
    verb: 'Modernize',
    summary: 'Redesign outdated interfaces so they are clear, responsive, and easier to use.',
    points: ['Interface redesign', 'Mobile-friendly layouts', 'Accessibility improvements'],
    cta: 'request-assessment',
  },
  {
    id: 'deployment-hosting',
    title: 'Deployment & Hosting',
    verb: 'Secure',
    summary: 'Getting your system online and keeping its environment configured and secure.',
    points: ['Deployment setup', 'Environment configuration', 'Hosting troubleshooting'],
    cta: 'consultation',
  },
  {
    id: 'performance-optimization',
    title: 'Performance Optimization',
    verb: 'Scale',
    summary: 'Find why a system is slow and make it noticeably faster.',
    points: ['Profiling and measurement', 'Database and code tuning', 'Front-end loading speed'],
    cta: 'request-assessment',
  },
  {
    id: 'technical-consultation',
    title: 'Technical Consultation',
    verb: 'Secure',
    summary: 'Straight advice on technology decisions, risks, and next steps before you commit budget.',
    points: [
      'System and architecture review',
      'Build, buy, or improve decisions',
      'Risk and security review',
    ],
    cta: 'consultation',
  },
];
