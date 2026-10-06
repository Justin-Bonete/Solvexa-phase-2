import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../database/client';
import { schema } from '../database/client';
import type { Env } from '../env';
import type { Mailer } from '../adapters/mailer';
import { MailerError } from '../adapters/mailer';
import { AppError, Errors } from '../utils/errors';
import { randomToken, sha256 } from '../utils/crypto';
import { burnVerify, hashPassword, verifyPassword } from './password.service';
import { hit } from './rate-limit.service';
import { audit } from './audit.service';
import { createSession, revokeAllForUser, revokeSession, type LoadedSession } from './session.service';
import { isEnrolled } from './totp.service';
import type { RegisterInput } from '../../shared/schemas/auth';
import type { SessionUser } from '../../shared/schemas/auth';
import type { TokenPurpose } from '../../shared/enums';

export type Ctx = {
  db: Db;
  env: Env;
  mailer: Mailer;
  ipHash: string;
  userAgentHash: string;
  requestId: string;
};

const LOCK_AFTER = 5;
const TOKEN_TTL: Record<TokenPurpose, number> = { verify_email: 24 * 3_600_000, reset_password: 60 * 60_000 };
/** Stay under Resend's free 100/day cap so a signup flood cannot silently exhaust it. */
const DAILY_MAIL_BUDGET = 90;

async function limit(ctx: Ctx, key: string, max: number, windowSec: number) {
  const r = await hit(ctx.db, key, max, windowSec);
  if (!r.allowed) throw Errors.rateLimited(r.retryAfterSec);
}

async function sendMail(ctx: Ctx, to: string, template: string, subject: string, text: string) {
  const budget = await hit(ctx.db, 'mail:daily', DAILY_MAIL_BUDGET, 86_400);
  if (!budget.allowed)
    throw new AppError(
      503,
      'EMAIL_BUDGET_EXHAUSTED',
      'Email sending is paused for today. Please try again tomorrow.',
    );
  try {
    await ctx.mailer.send({ to, subject, text });
    await ctx.db
      .insert(schema.emailOutbox)
      .values({ toEmail: to, template, status: 'sent', transport: ctx.mailer.name });
  } catch (e) {
    await ctx.db.insert(schema.emailOutbox).values({
      toEmail: to,
      template,
      status: 'failed',
      transport: ctx.mailer.name,
      error: e instanceof MailerError ? e.message : 'send failed',
    });
    throw new AppError(
      503,
      'EMAIL_UNAVAILABLE',
      'The email could not be sent right now. Please try again shortly.',
    );
  }
}

async function issueToken(ctx: Ctx, userId: string, purpose: TokenPurpose): Promise<string> {
  const raw = randomToken(32);
  await ctx.db.insert(schema.authTokens).values({
    tokenHash: sha256(raw),
    userId,
    purpose,
    expiresAt: new Date(Date.now() + TOKEN_TTL[purpose]),
  });
  return raw;
}

async function consumeToken(ctx: Ctx, raw: string, purpose: TokenPurpose) {
  const [t] = await ctx.db
    .select()
    .from(schema.authTokens)
    .where(and(eq(schema.authTokens.tokenHash, sha256(raw)), eq(schema.authTokens.purpose, purpose)));
  if (!t || t.usedAt || t.expiresAt.getTime() < Date.now())
    throw new AppError(400, 'TOKEN_INVALID', 'This link is invalid or has expired.');
  // Atomic single-use: only one concurrent request can flip usedAt.
  const [claimed] = await ctx.db
    .update(schema.authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(schema.authTokens.tokenHash, t.tokenHash), isNull(schema.authTokens.usedAt)))
    .returning();
  if (!claimed) throw new AppError(400, 'TOKEN_INVALID', 'This link is invalid or has expired.');
  return t.userId;
}

async function findUserByEmail(db: Db, email: string) {
  const [row] = await db
    .select({ u: schema.users, role: schema.roles.name })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(and(eq(schema.users.email, email), isNull(schema.users.deletedAt)));
  return row;
}

async function verifyTurnstile(env: Env, token: string | undefined, ip: string): Promise<void> {
  if (!env.REQUIRE_TURNSTILE) return;
  if (!env.TURNSTILE_SECRET) throw new AppError(503, 'BOT_CHECK_UNAVAILABLE', 'Bot check is not configured.');
  if (!token) throw new AppError(422, 'BOT_CHECK_FAILED', 'Complete the bot check and try again.');
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
  });
  const body = (await res.json()) as { success?: boolean };
  if (!body.success) throw new AppError(422, 'BOT_CHECK_FAILED', 'Bot check failed. Try again.');
}

export async function toSessionUser(db: Db, s: LoadedSession): Promise<SessionUser> {
  let mfa: SessionUser['mfa'] = 'not_required';
  if (s.user.role === 'admin') {
    if (!(await isEnrolled(db, s.user.id))) mfa = 'enrollment_required';
    else mfa = s.mfaVerifiedAt ? 'verified' : 'verification_required';
  }
  return {
    id: s.user.id,
    email: s.user.email,
    fullName: s.user.fullName,
    role: s.user.role,
    status: s.user.status,
    emailVerified: !!s.user.emailVerifiedAt,
    mfa,
  };
}

export async function register(ctx: Ctx, input: RegisterInput, ip: string) {
  await limit(ctx, `register:ip:${ctx.ipHash}`, 5, 3600);
  if (input.website) return; // honeypot: silently succeed, do nothing
  await verifyTurnstile(ctx.env, input.turnstileToken, ip);
  const existing = await findUserByEmail(ctx.db, input.email);
  if (existing) {
    // Identical response to a new signup; tell the real owner by email instead.
    await sendMail(
      ctx,
      input.email,
      'register_existing',
      'Your Solvexa account',
      `Someone tried to register with this email, but an account already exists.\nSign in or reset your password: ${ctx.env.APP_URL}/login\nIf this wasn't you, you can ignore this message.`,
    );
    return;
  }
  const passwordHash = await hashPassword(input.password);
  const [role] = await ctx.db.select().from(schema.roles).where(eq(schema.roles.name, 'client'));
  if (!role) throw new AppError(500, 'INTERNAL', 'Server is not seeded.');
  const userId = await ctx.db.transaction(async (tx) => {
    const [u] = await tx
      .insert(schema.users)
      .values({ email: input.email, passwordHash, roleId: role.id, fullName: input.fullName })
      .returning({ id: schema.users.id });
    if (!u) throw new Error('insert failed');
    await tx.insert(schema.clients).values({ userId: u.id, organization: input.organization ?? null });
    return u.id;
  });
  await audit(ctx.db, {
    action: 'auth.register',
    actorId: userId,
    actorRole: 'client',
    entityType: 'user',
    entityId: userId,
    ipHash: ctx.ipHash,
    requestId: ctx.requestId,
  });
  const token = await issueToken(ctx, userId, 'verify_email');
  await sendMail(
    ctx,
    input.email,
    'verify_email',
    'Verify your email for Solvexa',
    `Confirm your email to activate your account:\n${ctx.env.APP_URL}/verify-email?token=${token}\nThis link expires in 24 hours.`,
  );
}

export async function resendVerification(ctx: Ctx, email: string) {
  await limit(ctx, `resend:ip:${ctx.ipHash}`, 10, 3600);
  await limit(ctx, `resend:email:${sha256(email)}`, 3, 3600);
  const found = await findUserByEmail(ctx.db, email);
  if (!found || found.u.emailVerifiedAt || found.u.status === 'disabled') return;
  const token = await issueToken(ctx, found.u.id, 'verify_email');
  await sendMail(
    ctx,
    email,
    'verify_email',
    'Verify your email for Solvexa',
    `Confirm your email:\n${ctx.env.APP_URL}/verify-email?token=${token}\nThis link expires in 24 hours.`,
  );
}

export async function verifyEmail(ctx: Ctx, rawToken: string) {
  await limit(ctx, `verify:ip:${ctx.ipHash}`, 20, 3600);
  const userId = await consumeToken(ctx, rawToken, 'verify_email');
  await ctx.db
    .update(schema.users)
    .set({ emailVerifiedAt: new Date(), status: 'active', updatedAt: new Date() })
    .where(and(eq(schema.users.id, userId), eq(schema.users.status, 'pending_verification')));
  await audit(ctx.db, {
    action: 'auth.verify_email',
    actorId: userId,
    entityType: 'user',
    entityId: userId,
    ipHash: ctx.ipHash,
    requestId: ctx.requestId,
  });
}

export async function login(
  ctx: Ctx,
  input: { email: string; password: string },
  previousSessionId?: string,
) {
  await limit(ctx, `login:ip:${ctx.ipHash}`, 20, 900);
  await limit(ctx, `login:ipemail:${ctx.ipHash}:${sha256(input.email)}`, 5, 900);
  const found = await findUserByEmail(ctx.db, input.email);
  const now = Date.now();
  if (
    !found ||
    found.u.status === 'disabled' ||
    (found.u.lockedUntil && found.u.lockedUntil.getTime() > now)
  ) {
    await burnVerify(input.password); // uniform timing and response; never reveals existence or lock state
    await audit(ctx.db, {
      action: 'auth.login.failed',
      actorId: found?.u.id ?? null,
      ipHash: ctx.ipHash,
      requestId: ctx.requestId,
      after: { reason: found ? 'locked_or_disabled' : 'unknown' },
    });
    throw Errors.invalidCredentials();
  }
  const ok = await verifyPassword(found.u.passwordHash, input.password);
  if (!ok) {
    const count = found.u.failedLoginCount + 1;
    const lock =
      count >= LOCK_AFTER ? new Date(now + Math.min(15, 2 ** (count - LOCK_AFTER)) * 60_000) : null;
    await ctx.db
      .update(schema.users)
      .set({ failedLoginCount: count, lockedUntil: lock })
      .where(eq(schema.users.id, found.u.id));
    await audit(ctx.db, {
      action: lock ? 'auth.login.locked' : 'auth.login.failed',
      actorId: found.u.id,
      ipHash: ctx.ipHash,
      requestId: ctx.requestId,
    });
    throw Errors.invalidCredentials();
  }
  if (found.u.status === 'pending_verification')
    throw new AppError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Verify your email before signing in. You can request a new link.',
    );
  await ctx.db
    .update(schema.users)
    .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(schema.users.id, found.u.id));
  if (previousSessionId) await revokeSession(ctx.db, previousSessionId); // rotation: never reuse a session id across login
  const session = await createSession(ctx.db, { id: found.u.id, role: found.role }, ctx);
  await audit(ctx.db, {
    action: 'auth.login.success',
    actorId: found.u.id,
    actorRole: found.role,
    ipHash: ctx.ipHash,
    requestId: ctx.requestId,
  });
  return { session, userId: found.u.id };
}

export async function logout(ctx: Ctx, rawId: string, actor: { id: string; role: string }) {
  await revokeSession(ctx.db, rawId);
  await audit(ctx.db, {
    action: 'auth.logout',
    actorId: actor.id,
    actorRole: actor.role,
    ipHash: ctx.ipHash,
    requestId: ctx.requestId,
  });
}

export async function forgotPassword(ctx: Ctx, email: string) {
  await limit(ctx, `forgot:ip:${ctx.ipHash}`, 10, 3600);
  await limit(ctx, `forgot:email:${sha256(email)}`, 3, 3600);
  const found = await findUserByEmail(ctx.db, email);
  if (!found || found.u.status === 'disabled') return; // identical response either way
  const token = await issueToken(ctx, found.u.id, 'reset_password');
  await audit(ctx.db, {
    action: 'auth.password.reset_requested',
    actorId: found.u.id,
    ipHash: ctx.ipHash,
    requestId: ctx.requestId,
  });
  await sendMail(
    ctx,
    email,
    'reset_password',
    'Reset your Solvexa password',
    `Reset your password:\n${ctx.env.APP_URL}/reset-password?token=${token}\nThis link expires in 60 minutes. If you didn't request it, ignore this email.`,
  );
}

export async function resetPassword(ctx: Ctx, rawToken: string, newPassword: string) {
  await limit(ctx, `reset:ip:${ctx.ipHash}`, 10, 3600);
  const userId = await consumeToken(ctx, rawToken, 'reset_password');
  const passwordHash = await hashPassword(newPassword);
  await ctx.db
    .update(schema.users)
    .set({ passwordHash, failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
  await revokeAllForUser(ctx.db, userId);
  await audit(ctx.db, {
    action: 'auth.password.reset',
    actorId: userId,
    ipHash: ctx.ipHash,
    requestId: ctx.requestId,
  });
}

export async function changePassword(
  ctx: Ctx,
  user: { id: string; role: 'admin' | 'client'; passwordHash: string },
  current: string,
  next: string,
) {
  await limit(ctx, `chpw:user:${user.id}`, 5, 3600);
  if (!(await verifyPassword(user.passwordHash, current)))
    throw new AppError(403, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
  await ctx.db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(next), updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));
  await revokeAllForUser(ctx.db, user.id);
  const session = await createSession(ctx.db, { id: user.id, role: user.role }, ctx); // rotated
  await audit(ctx.db, {
    action: 'auth.password.changed',
    actorId: user.id,
    actorRole: user.role,
    ipHash: ctx.ipHash,
    requestId: ctx.requestId,
  });
  return session;
}
