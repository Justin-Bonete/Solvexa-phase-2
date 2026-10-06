/** `todo` notes are instructions for the site owner: shown only while placeholders are visible, never in production. */
export type LegalSection = { heading: string; body: string[]; todo?: string[] };
export type LegalDoc = { title: string; updated: string; sections: LegalSection[] };

/** DRAFT templates. They describe what the site actually does today and must be reviewed by a lawyer before launch. */
export const privacy: LegalDoc = {
  title: 'Privacy Policy',
  updated: 'Draft',
  sections: [
    {
      heading: 'What I collect',
      body: [
        'When you create an account I collect your name, email address, and optionally your organization. Your password is stored only as a salted Argon2id hash.',
        'To keep accounts secure I also store session records and security logs, which use hashed or abbreviated technical identifiers rather than raw IP addresses.',
        'When contact and assessment forms are released, the information you submit through them will be used to respond to your request.',
      ],
    },
    {
      heading: 'Cookies',
      body: [
        'The site uses strictly necessary cookies for sign-in and security (session and CSRF protection). It does not use advertising or analytics cookies.',
      ],
    },
    {
      heading: 'How I use it',
      body: [
        'I use your information to run your account, respond to your requests, send account emails such as verification and password reset, and keep the service secure.',
        'I do not sell your information.',
      ],
    },
    {
      heading: 'Service providers',
      body: [
        'The site relies on hosting, database, and email delivery providers to operate. They process data only to provide those services.',
      ],
    },
    {
      heading: 'Your choices',
      body: ['You can ask to access, correct, or delete your information by contacting me.'],
      todo: ['Add the rights and contact process that apply in your jurisdiction.'],
    },
    {
      heading: 'Retention',
      body: [],
      todo: ['State how long account data, request data, and logs are kept.'],
    },
  ],
};

export const terms: LegalDoc = {
  title: 'Terms of Use',
  updated: 'Draft',
  sections: [
    {
      heading: 'About this site',
      body: [
        'This site presents my software development services and provides accounts for clients. Information on it is general and not a binding offer.',
      ],
    },
    {
      heading: 'Accounts',
      body: [
        'You are responsible for keeping your password secure and for activity under your account. Do not share credentials through forms or messages on this site.',
      ],
    },
    {
      heading: 'Acceptable use',
      body: ["Do not attempt to access other users' data, disrupt the service, or upload harmful files."],
    },
    {
      heading: 'Project work',
      body: [
        'Scope, pricing, timelines, ownership, and support for any project are set out in a separate written agreement.',
      ],
      todo: ['Add your standard terms.'],
    },
    {
      heading: 'Liability',
      body: [],
      todo: ['Add the limitation of liability and governing law that apply to you.'],
    },
  ],
};
