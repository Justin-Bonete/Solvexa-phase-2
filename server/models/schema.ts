import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { ROLES, TOKEN_PURPOSES, USER_STATUSES } from '../../shared/enums';

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
