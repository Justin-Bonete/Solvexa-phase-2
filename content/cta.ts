/**
 * CTA library. A CTA is a link only when its destination exists (`enabled: true`).
 * Otherwise it renders visibly disabled with the reason. Flip `enabled` when the page ships.
 */
export type CtaId =
  | 'start-project'
  | 'view-work'
  | 'existing-system'
  | 'consultation'
  | 'tell-me'
  | 'improve-existing'
  | 'request-assessment'
  | 'discuss-project'
  | 'technical-support'
  | 'view-case-study'
  | 'start-conversation'
  | 'need-similar';

export type CtaDef = { label: string; to: string; enabled: boolean; reason?: string };

const TICKET_SOON = 'Opens with the support area, coming in a later release.';

export const cta: Record<CtaId, CtaDef> = {
  'start-project': { label: 'Start a Project', to: '/contact', enabled: true },
  'view-work': { label: 'View My Work', to: '/projects', enabled: true },
  'existing-system': { label: 'Need Help With an Existing System?', to: '/solutions', enabled: true },
  consultation: { label: 'Request a Consultation', to: '/contact', enabled: true },
  'tell-me': { label: 'Tell Me What You Need', to: '/contact', enabled: true },
  'improve-existing': { label: 'Improve My Existing System', to: '/enhancement', enabled: true },
  'request-assessment': { label: 'Request System Assessment', to: '/assessment', enabled: true },
  'discuss-project': { label: 'Discuss a Project', to: '/contact', enabled: true },
  'technical-support': { label: 'Get Technical Support', to: '/portal', enabled: false, reason: TICKET_SOON },
  'view-case-study': { label: 'View Case Study', to: '/projects', enabled: true },
  'start-conversation': { label: 'Start a Conversation', to: '/contact', enabled: true },
  'need-similar': { label: 'Need Something Similar?', to: '/contact', enabled: true },
};
