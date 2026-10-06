import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../database/client';
import { schema } from '../database/client';
import { randomToken, sha256 } from '../utils/crypto';
import type { RoleName } from '../../shared/enums';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** Idle and absolute timeouts by role (see Phase 0 §4.1). */
export const TIMEOUTS: Record<RoleName, { idle: number; absolute: number }> = {
  client: { idle: 2 * HOUR, absolute: 7 * DAY },
  admin: { idle: 30 * MIN, absolute: 12 * HOUR },
};

export type SessionContext = { ipHash?: string | null; userAgentHash?: string | null };

export async function createSession(db: Db, user: { id: string; role: RoleName }, ctx: SessionContext) {
  const id = randomToken(32);
  const csrf = randomToken(24);
  const t = TIMEOUTS[user.role];
  const now = Date.now();
  await db.insert(schema.sessions).values({
    idHash: sha256(id),
    userId: user.id,
    csrfSecret: csrf,
    idleExpiresAt: new Date(now + t.idle),
    absoluteExpiresAt: new Date(now + t.absolute),
    ipHash: ctx.ipHash ?? null,
    userAgentHash: ctx.userAgentHash ?? null,
  });
  return { id, csrf, maxAgeSec: Math.floor(t.absolute / 1000) };
}

export async function revokeSession(db: Db, rawId: string): Promise<void> {
  await db
    .update(schema.sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.sessions.idHash, sha256(rawId)), isNull(schema.sessions.revokedAt)));
}

export async function revokeAllForUser(db: Db, userId: string, exceptRawId?: string): Promise<void> {
  const rows = await db
    .select({ h: schema.sessions.idHash })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt)));
  const keep = exceptRawId ? sha256(exceptRawId) : null;
  for (const r of rows)
    if (r.h !== keep)
      await db.update(schema.sessions).set({ revokedAt: new Date() }).where(eq(schema.sessions.idHash, r.h));
}

export type LoadedSession = {
  idHash: string;
  csrfSecret: string;
  mfaVerifiedAt: Date | null;
  user: typeof schema.users.$inferSelect & { role: RoleName };
};

/** Validates revocation, idle and absolute expiry, user status; slides the idle window. */
export async function loadSession(db: Db, rawId: string): Promise<LoadedSession | null> {
  const [row] = await db
    .select({ s: schema.sessions, u: schema.users, role: schema.roles.name })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(eq(schema.sessions.idHash, sha256(rawId)));
  if (!row) return null;
  const { s, u } = row;
  const now = Date.now();
  if (s.revokedAt || s.idleExpiresAt.getTime() <= now || s.absoluteExpiresAt.getTime() <= now) return null;
  if (u.deletedAt || u.status === 'disabled') return null;
  // Slide the idle window, but write at most once a minute.
  if (now - s.lastSeenAt.getTime() > MIN) {
    const idle = Math.min(now + TIMEOUTS[row.role].idle, s.absoluteExpiresAt.getTime());
    await db
      .update(schema.sessions)
      .set({ lastSeenAt: new Date(now), idleExpiresAt: new Date(idle) })
      .where(eq(schema.sessions.idHash, s.idHash));
  }
  return {
    idHash: s.idHash,
    csrfSecret: s.csrfSecret,
    mfaVerifiedAt: s.mfaVerifiedAt,
    user: { ...u, role: row.role },
  };
}

export async function markMfaVerified(db: Db, idHash: string): Promise<void> {
  await db
    .update(schema.sessions)
    .set({ mfaVerifiedAt: new Date() })
    .where(eq(schema.sessions.idHash, idHash));
}

export async function purgeExpiredSessions(db: Db): Promise<void> {
  const rows = await db
    .select({ h: schema.sessions.idHash, a: schema.sessions.absoluteExpiresAt })
    .from(schema.sessions);
  const cutoff = Date.now() - DAY;
  for (const r of rows)
    if (r.a.getTime() < cutoff) await db.delete(schema.sessions).where(eq(schema.sessions.idHash, r.h));
}
