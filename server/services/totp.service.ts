import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../database/client';
import { schema } from '../database/client';
import { decrypt, encrypt, randomToken, sha256 } from '../utils/crypto';

authenticator.options = { window: 1, step: 30, digits: 6 };
const STEP_MS = 30_000;
const ISSUER = 'Solvexa';

export async function startEnrollment(db: Db, user: { id: string; email: string }, key: string) {
  const [existing] = await db.select().from(schema.userTotp).where(eq(schema.userTotp.userId, user.id));
  if (existing?.confirmedAt) return { alreadyEnrolled: true as const };
  const secret = authenticator.generateSecret(20);
  const secretEnc = encrypt(secret, key);
  if (existing)
    await db.update(schema.userTotp).set({ secretEnc }).where(eq(schema.userTotp.userId, user.id));
  else await db.insert(schema.userTotp).values({ userId: user.id, secretEnc });
  const otpauth = authenticator.keyuri(user.email, ISSUER, secret);
  const qrSvg = await QRCode.toString(otpauth, { type: 'svg', margin: 1 });
  // The secret is shown once for manual entry; it is never returned again.
  return { alreadyEnrolled: false as const, otpauth, qrSvg, manualKey: secret };
}

async function acceptCode(
  db: Db,
  userId: string,
  code: string,
  key: string,
  requireConfirmed: boolean,
): Promise<boolean> {
  const [row] = await db.select().from(schema.userTotp).where(eq(schema.userTotp.userId, userId));
  if (!row || (requireConfirmed && !row.confirmedAt)) return false;
  const delta = authenticator.checkDelta(code, decrypt(row.secretEnc, key));
  if (delta === null) return false;
  const step = Math.floor(Date.now() / STEP_MS) + delta;
  if (row.lastStep !== null && step <= row.lastStep) return false; // replay
  await db.update(schema.userTotp).set({ lastStep: step }).where(eq(schema.userTotp.userId, userId));
  return true;
}

/** Confirms enrollment and returns 10 single-use recovery codes (plaintext shown once). */
export async function confirmEnrollment(
  db: Db,
  userId: string,
  code: string,
  key: string,
): Promise<string[] | null> {
  if (!(await acceptCode(db, userId, code, key, false))) return null;
  await db.update(schema.userTotp).set({ confirmedAt: new Date() }).where(eq(schema.userTotp.userId, userId));
  await db.delete(schema.recoveryCodes).where(eq(schema.recoveryCodes.userId, userId));
  const codes = Array.from({ length: 10 }, () => randomToken(6).toUpperCase().replace(/[-_]/g, 'X'));
  for (const c of codes) await db.insert(schema.recoveryCodes).values({ userId, codeHash: sha256(c) });
  return codes;
}

export async function verifyTotp(db: Db, userId: string, code: string, key: string) {
  if (/^\d{6}$/.test(code)) return (await acceptCode(db, userId, code, key, true)) ? ('totp' as const) : null;
  const h = sha256(code.trim().toUpperCase());
  const [rc] = await db
    .select()
    .from(schema.recoveryCodes)
    .where(
      and(
        eq(schema.recoveryCodes.userId, userId),
        eq(schema.recoveryCodes.codeHash, h),
        isNull(schema.recoveryCodes.usedAt),
      ),
    );
  if (!rc) return null;
  await db.update(schema.recoveryCodes).set({ usedAt: new Date() }).where(eq(schema.recoveryCodes.id, rc.id));
  return 'recovery' as const;
}

export async function isEnrolled(db: Db, userId: string): Promise<boolean> {
  const [row] = await db.select().from(schema.userTotp).where(eq(schema.userTotp.userId, userId));
  return !!row?.confirmedAt;
}

/**
 * Break-glass reset for an admin who lost their authenticator AND recovery codes.
 * Only reachable from the CLI with direct database access (never exposed over HTTP).
 * Removes TOTP + recovery codes, revokes all sessions; the admin must re-enroll at next login.
 */
export async function resetAdminMfa(db: Db, email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.users.id, role: schema.roles.name })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(and(eq(schema.users.email, email.trim().toLowerCase()), isNull(schema.users.deletedAt)));
  if (!row || row.role !== 'admin') return false;
  await db.delete(schema.userTotp).where(eq(schema.userTotp.userId, row.id));
  await db.delete(schema.recoveryCodes).where(eq(schema.recoveryCodes.userId, row.id));
  await db.update(schema.sessions).set({ revokedAt: new Date() }).where(eq(schema.sessions.userId, row.id));
  await db
    .insert(schema.activityLogs)
    .values({ action: 'auth.mfa.reset_cli', actorRole: 'cli', entityType: 'user', entityId: row.id });
  return true;
}
