import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  ACCESS_STATES,
  CURRENCIES,
  ONLINE_STATUSES,
  PRIORITIES,
  PROJECT_TYPES,
  REQUEST_KINDS,
  REQUEST_PATHS,
  REQUEST_STATUSES,
  ROLES,
  SCAN_STATUSES,
  TIMELINES,
  TOKEN_PURPOSES,
  USER_BANDS,
  USER_STATUSES,
} from '../../shared/enums';

export const roleName = pgEnum('role_name', ROLES);
export const userStatus = pgEnum('user_status', USER_STATUSES);
export const tokenPurpose = pgEnum('token_purpose', TOKEN_PURPOSES);

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
const deletedAt = () => timestamp('deleted_at', { withTimezone: true });

export const roles = pgTable('roles', {
  id: id(),
  name: roleName('name').notNull().unique(),
  description: text('description').notNull().default(''),
});

export const users = pgTable(
  'users',
  {
    id: id(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    fullName: text('full_name').notNull(),
    status: userStatus('status').notNull().default('pending_verification'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex('users_email_active_uq')
      .on(t.email)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const clients = pgTable(
  'clients',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    organization: text('organization'),
    phone: text('phone'),
    country: text('country'),
    industry: text('industry'),
    timezone: text('timezone'),
    notesInternal: text('notes_internal'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [uniqueIndex('clients_user_uq').on(t.userId)],
);

export const sessions = pgTable(
  'sessions',
  {
    idHash: text('id_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    csrfSecret: text('csrf_secret').notNull(),
    createdAt: createdAt(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    idleExpiresAt: timestamp('idle_expires_at', { withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp('absolute_expires_at', { withTimezone: true }).notNull(),
    /** Set once the admin passes TOTP for this session. */
    mfaVerifiedAt: timestamp('mfa_verified_at', { withTimezone: true }),
    ipHash: text('ip_hash'),
    userAgentHash: text('user_agent_hash'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_idle_idx').on(t.idleExpiresAt)],
);

export const authTokens = pgTable(
  'auth_tokens',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    purpose: tokenPurpose('purpose').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('auth_tokens_user_idx').on(t.userId, t.purpose)],
);

export const userTotp = pgTable('user_totp', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  /** AES-256-GCM: iv.tag.ciphertext (base64url). Never stored in plaintext. */
  secretEnc: text('secret_enc').notNull(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  /** Last accepted time-step, for replay protection. */
  lastStep: integer('last_step'),
  createdAt: createdAt(),
});

export const recoveryCodes = pgTable(
  'recovery_codes',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    codeHash: text('code_hash').notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('recovery_codes_user_idx').on(t.userId)],
);

/** Postgres-backed fixed-window counters, so limits hold across serverless instances. */
export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [uniqueIndex('rate_limits_key_window_uq').on(t.key, t.windowStart)],
);

/** Append-only. Production should REVOKE UPDATE, DELETE on this table from the app role (see docs/security.md). */
export const activityLogs = pgTable(
  'activity_logs',
  {
    id: id(),
    actorId: uuid('actor_id'),
    actorRole: text('actor_role'),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    ipHash: text('ip_hash'),
    requestId: text('request_id'),
    createdAt: createdAt(),
  },
  (t) => [
    index('activity_entity_idx').on(t.entityType, t.entityId, t.createdAt),
    index('activity_actor_idx').on(t.actorId, t.createdAt),
  ],
);

export const emailOutbox = pgTable('email_outbox', {
  id: id(),
  toEmail: text('to_email').notNull(),
  template: text('template').notNull(),
  status: text('status').notNull().default('pending'),
  transport: text('transport').notNull(),
  error: text('error'),
  createdAt: createdAt(),
});

// ---------------- Phase 3: intake ----------------
export const requestPath = pgEnum('request_path', REQUEST_PATHS);
export const projectType = pgEnum('project_type', PROJECT_TYPES);
export const requestStatus = pgEnum('request_status', REQUEST_STATUSES);
export const requestKind = pgEnum('request_kind', REQUEST_KINDS);
export const priority = pgEnum('priority', PRIORITIES);
export const timeline = pgEnum('timeline', TIMELINES);
export const userBand = pgEnum('user_band', USER_BANDS);
export const onlineStatus = pgEnum('online_status', ONLINE_STATUSES);
export const accessState = pgEnum('access_state', ACCESS_STATES);
export const scanStatus = pgEnum('scan_status', SCAN_STATUSES);
export const currency = pgEnum('currency', CURRENCIES);

export const requestReferenceSeq = pgSequence('request_reference_seq', { startWith: 1, increment: 1 });

/** Both general inquiries and system assessments live here (kind). `client_id` is null for anonymous visitors. */
export const projectRequests = pgTable(
  'project_requests',
  {
    id: id(),
    reference: text('reference').notNull(),
    kind: requestKind('kind').notNull().default('inquiry'),
    clientId: uuid('client_id').references(() => clients.id),
    contactName: text('contact_name').notNull(),
    contactEmail: text('contact_email').notNull(),
    organization: text('organization'),
    phone: text('phone'),
    country: text('country'),
    industry: text('industry'),
    path: requestPath('path').notNull(),
    projectType: projectType('project_type').notNull(),
    hasExistingSystem: boolean('has_existing_system').notNull().default(false),
    currentTechnology: text('current_technology'),
    systemUrl: text('system_url'),
    description: text('description').notNull(),
    mainProblems: text('main_problems'),
    requiredFeatures: text('required_features'),
    expectedUsers: userBand('expected_users'),
    budgetAmount: integer('budget_amount'),
    budgetCurrency: currency('budget_currency'),
    timeline: timeline('timeline'),
    priority: priority('priority').notNull().default('medium'),
    additionalInfo: text('additional_info'),
    status: requestStatus('status').notNull().default('new'),
    internalNotes: text('internal_notes'),
    consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
    ipHash: text('ip_hash'),
    idempotencyKey: text('idempotency_key'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex('project_requests_reference_uq').on(t.reference),
    uniqueIndex('project_requests_idem_uq')
      .on(t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
    index('project_requests_status_idx').on(t.status, t.createdAt),
    index('project_requests_email_idx').on(t.contactEmail),
    check('project_requests_budget_nonneg', sql`${t.budgetAmount} is null or ${t.budgetAmount} >= 0`),
    check(
      'project_requests_budget_currency',
      sql`${t.budgetAmount} is null or ${t.budgetCurrency} is not null`,
    ),
  ],
);

/** Booleans/enums only for access: credentials are never collected. */
export const systemAssessments = pgTable(
  'system_assessments',
  {
    id: id(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => projectRequests.id),
    currentSystem: text('current_system').notNull(),
    technology: text('technology'),
    originalDeveloper: text('original_developer'),
    problems: text('problems').notNull(),
    isOnline: onlineStatus('is_online').notNull(),
    featuresToImprove: text('features_to_improve'),
    errorsObserved: text('errors_observed'),
    userCount: userBand('user_count'),
    databaseType: text('database_type'),
    hasSourceAccess: accessState('has_source_access').notNull(),
    hasServerAccess: accessState('has_server_access').notNull(),
    hasDbAccess: accessState('has_db_access').notNull(),
    desiredImprovements: text('desired_improvements').notNull(),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [uniqueIndex('system_assessments_request_uq').on(t.requestId)],
);

/** Files are stored outside the web root (Storage interface). The key is random; the original name is display-only metadata. */
export const attachments = pgTable(
  'attachments',
  {
    id: id(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => projectRequests.id),
    storageKey: text('storage_key').notNull(),
    originalName: text('original_name').notNull(),
    mime: text('mime').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256: text('sha256').notNull(),
    scanStatus: scanStatus('scan_status').notNull().default('not_scanned'),
    uploadedBy: uuid('uploaded_by').references(() => users.id),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex('attachments_key_uq').on(t.storageKey),
    index('attachments_request_idx').on(t.requestId),
  ],
);
