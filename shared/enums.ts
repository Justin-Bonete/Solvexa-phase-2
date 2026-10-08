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
  'inquiry.created',
  'inquiry.attachment.uploaded',
  'admin.inquiry.updated',
  'admin.inquiry.deleted',
  'admin.attachment.downloaded',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ---- Intake (Phase 3) ----
export const REQUEST_PATHS = ['new', 'existing', 'idea'] as const;
export type RequestPath = (typeof REQUEST_PATHS)[number];

export const PROJECT_TYPES = [
  'new_website',
  'new_web_application',
  'business_system',
  'e_commerce',
  'pos',
  'inventory',
  'management_system',
  'system_maintenance',
  'bug_fixing',
  'system_enhancement',
  'system_modernization',
  'database_work',
  'api_integration',
  'deployment',
  'technical_consultation',
  'other',
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  new_website: 'New Website',
  new_web_application: 'New Web Application',
  business_system: 'Business System',
  e_commerce: 'E-Commerce',
  pos: 'POS',
  inventory: 'Inventory',
  management_system: 'Management System',
  system_maintenance: 'System Maintenance',
  bug_fixing: 'Bug Fixing',
  system_enhancement: 'System Enhancement',
  system_modernization: 'System Modernization',
  database_work: 'Database Work',
  api_integration: 'API Integration',
  deployment: 'Deployment',
  technical_consultation: 'Technical Consultation',
  other: 'Other',
};

export const REQUEST_STATUSES = [
  'new',
  'reviewing',
  'contacted',
  'qualified',
  'converted',
  'declined',
  'spam',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const REQUEST_KINDS = ['inquiry', 'assessment'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const ONLINE_STATUSES = ['online', 'offline', 'partially', 'unknown'] as const;
export const ONLINE_LABELS = {
  online: 'Yes, it is online',
  offline: 'No, it is not online',
  partially: 'Partly working',
  unknown: 'Not sure',
} as const;
export const ACCESS_STATES = ['yes', 'no', 'unsure'] as const;
export const ACCESS_LABELS = { yes: 'Yes', no: 'No', unsure: 'Not sure' } as const;

export const SCAN_STATUSES = ['not_scanned', 'clean', 'infected'] as const;

/** Budget currencies offered in the form. Amounts are whole units of the chosen currency. */
export const CURRENCIES = ['PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY'] as const;

export const TIMELINES = [
  'asap',
  'within_1_month',
  'one_to_three_months',
  'three_to_six_months',
  'flexible',
] as const;
export const TIMELINE_LABELS = {
  asap: 'As soon as possible',
  within_1_month: 'Within a month',
  one_to_three_months: '1 to 3 months',
  three_to_six_months: '3 to 6 months',
  flexible: 'Flexible',
} as const;

export const USER_BANDS = [
  'under_10',
  'ten_to_50',
  'fifty_to_200',
  'two_hundred_to_1000',
  'over_1000',
  'unknown',
] as const;
export const USER_BAND_LABELS = {
  under_10: 'Fewer than 10',
  ten_to_50: '10 to 50',
  fifty_to_200: '50 to 200',
  two_hundred_to_1000: '200 to 1,000',
  over_1000: 'More than 1,000',
  unknown: 'Not sure',
} as const;

export const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' } as const;
export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  declined: 'Declined',
  spam: 'Spam',
};
