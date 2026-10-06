import type { CtaId } from './cta';

export type Landing = {
  slug: 'maintenance' | 'enhancement' | 'new-system-development';
  path: string;
  verb: string;
  title: string;
  lead: string;
  includes: { title: string; text: string }[];
  fitsWhen: string[];
  steps: { title: string; text: string }[];
  cta: CtaId;
  secondaryCta: CtaId;
  /** Anchored section for details that are agreed per client and not yet defined. */
  supportNote?: { id: string; title: string; text: string; placeholder: boolean };
};

export const landings: Landing[] = [
  {
    slug: 'new-system-development',
    path: '/new-system-development',
    verb: 'Build',
    title: 'Build a new system',
    lead: 'If you need something that does not exist yet, I can build it: a web application, a business system, or a custom tool designed around your process.',
    includes: [
      {
        title: 'Requirements and scoping',
        text: 'We agree what the system must do, who uses it, and what comes first.',
      },
      { title: 'Design', text: 'Screens, data model, and access rules planned before building starts.' },
      { title: 'Development', text: 'Built and shown to you in small steps so you can steer along the way.' },
      { title: 'Testing and release', text: 'Checked thoroughly, then deployed with a clear handover.' },
    ],
    fitsWhen: [
      'You are replacing paper, spreadsheets, or disconnected tools',
      'Nothing off the shelf fits how you work',
      'You have an idea and need help turning it into a plan',
    ],
    steps: [
      { title: 'Tell me what you need', text: 'Share the problem and who will use the system.' },
      { title: 'We agree the scope', text: 'You get a clear plan and priorities before any build work.' },
      { title: 'I build in stages', text: 'You see progress and give feedback regularly.' },
      { title: 'Launch and support', text: 'I deploy it, hand it over, and can stay on to maintain it.' },
    ],
    cta: 'start-project',
    secondaryCta: 'consultation',
  },
  {
    slug: 'enhancement',
    path: '/enhancement',
    verb: 'Improve',
    title: 'Improve and modernize what you have',
    lead: 'If you already have a system, you do not need to start over. I can add features, modernize the interface, speed it up, and tighten security.',
    includes: [
      { title: 'New features', text: 'Add the modules and workflows your team is still doing by hand.' },
      { title: 'UI/UX modernization', text: 'Redesign outdated screens so they work well on any device.' },
      { title: 'Performance and database', text: 'Find what is slow and fix it at the source.' },
      { title: 'Security and upgrades', text: 'Close weaknesses and move to current, supported versions.' },
    ],
    fitsWhen: [
      'The system works but is slow, dated, or limited',
      'Your team works around the system instead of with it',
      'It runs on older technology such as legacy PHP',
    ],
    steps: [
      { title: 'Assessment', text: 'I review the system and how it is used.' },
      { title: 'Improvement plan', text: 'A prioritized list of what to change first.' },
      { title: 'Incremental changes', text: 'Improvements are made and tested in small steps.' },
      { title: 'Careful release', text: 'Deployed with a way back if anything goes wrong.' },
    ],
    cta: 'request-assessment',
    secondaryCta: 'improve-existing',
  },
  {
    slug: 'maintenance',
    path: '/maintenance',
    verb: 'Maintain',
    title: 'Fix, maintain, and keep it running',
    lead: 'If it is broken, I can troubleshoot it. If it is working, I can keep it that way with updates, fixes, and someone who knows the system.',
    includes: [
      {
        title: 'Bug fixing and troubleshooting',
        text: 'Finding the real cause of errors and fixing them properly.',
      },
      { title: 'Updates and patches', text: 'Keeping components current and addressing known weaknesses.' },
      {
        title: 'Hosting and deployment help',
        text: 'Resolving environment problems and keeping releases safe.',
      },
      { title: 'Small improvements', text: 'Ongoing adjustments as your needs change.' },
    ],
    fitsWhen: [
      'Something stopped working or errors keep coming back',
      'The original developer is no longer available',
      'You want one person responsible for the system long term',
    ],
    steps: [
      { title: 'Describe the problem', text: 'Tell me what is happening and when it started.' },
      { title: 'Diagnose', text: 'I find the cause rather than patching the symptom.' },
      { title: 'Fix and verify', text: 'I fix it and check it works without breaking other things.' },
      { title: 'Stay on', text: 'If you want, I keep maintaining the system going forward.' },
    ],
    cta: 'technical-support',
    secondaryCta: 'start-conversation',
    supportNote: {
      id: 'support-plans',
      title: 'Long-term support',
      text: 'Placeholder: describe the support arrangements you offer, what they include, and how response times work. These are agreed per client and are not defined yet.',
      placeholder: true,
    },
  },
];
