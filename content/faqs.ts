export type Faq = {
  id: string;
  q: string;
  a: string;
  /** unverified commitments stay placeholders until you confirm them */ placeholder: boolean;
};

export const faqs: Faq[] = [
  {
    id: 'from-scratch',
    q: 'Do I have to rebuild my system from scratch?',
    a: 'Not necessarily. I start by assessing what you have. Many problems, such as bugs, slow pages, outdated screens, and missing features, can be fixed or improved without a rebuild. If a rebuild really is the better choice, I will tell you why.',
    placeholder: false,
  },
  {
    id: 'someone-else',
    q: 'Can you work on a system someone else built?',
    a: 'Yes. If you already have a system, I can review it, fix it, improve it, or modernize it, including older PHP systems.',
    placeholder: false,
  },
  {
    id: 'credentials',
    q: 'Can I send you passwords or server access in the forms?',
    a: "No. Never send passwords, API keys, or server credentials through the site. If access is needed, I'll arrange a secure method.",
    placeholder: false,
  },
  {
    id: 'assessment',
    q: 'What should I prepare for a system assessment?',
    a: 'A short description of the system, what is going wrong, any error messages or screenshots, roughly how many people use it, and whether you have the source code and hosting access. You do not need to share the credentials themselves.',
    placeholder: false,
  },
  {
    id: 'who',
    q: 'Who will I be working with?',
    a: 'Directly with me. I work as an independent developer, so the person you talk to is the person building and supporting your system.',
    placeholder: false,
  },
  {
    id: 'technology',
    q: 'What technologies do you use?',
    a: 'This site is built with React, TypeScript, Node.js, and PostgreSQL, and I work with PHP when modernizing legacy systems. The right stack for your project depends on what you already have and what you need.',
    placeholder: false,
  },
  {
    id: 'cost',
    q: 'How much does a project cost?',
    a: 'Placeholder: describe how you price work (fixed quote, hourly, retainer) and what affects the price.',
    placeholder: true,
  },
  {
    id: 'timeline',
    q: 'How long does a project take?',
    a: 'Placeholder: give honest typical ranges for small fixes, enhancements, and new systems.',
    placeholder: true,
  },
  {
    id: 'support-plans',
    q: 'Do you offer ongoing support plans?',
    a: 'Placeholder: describe available maintenance arrangements, what they include, and how response times are handled.',
    placeholder: true,
  },
];
