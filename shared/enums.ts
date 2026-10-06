/** Single source of truth for enums used by the DB, API and UI. */
export const ROLES = ['admin', 'client'] as const;
export type RoleName = (typeof ROLES)[number];

export const USER_STATUSES = ['pending_verification', 'active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TOKEN_PURPOSES = ['verify_email', 'reset_password'] as const;
export type TokenPurpose = (typeof TOKEN_PURPOSES)[number];

export const PROJECT_STAGES = [
  'INQUIRY',
  'ASSESSMENT',
  'PLANNING',
  'DESIGN',
  'DEVELOPMENT',
  'TESTING',
  'CLIENT_REVIEW',
  'DEPLOYMENT',
  'MAINTENANCE',
  'COMPLETED',
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const CONVERSATION_STATUSES = [
  'NEW',
  'ACTIVE',
  'WAITING_FOR_CLIENT',
  'WAITING_FOR_DEVELOPER',
  'RESOLVED',
  'ARCHIVED',
] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const AUDIT_ACTIONS = [
  'auth.register',
  'auth.verify_email',
  'auth.login.success',
  'auth.login.failed',
  'auth.login.locked',
  'auth.logout',
  'auth.password.reset_requested',
  'auth.password.reset',
  'auth.password.changed',
  'auth.mfa.enrolled',
  'auth.mfa.verified',
  'auth.mfa.failed',
  'auth.mfa.recovery_used',
  'auth.session.revoked',
  'admin.user.disabled',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
