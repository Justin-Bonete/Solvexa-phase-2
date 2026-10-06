import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import * as svc from '../services/auth.service';
import { schema } from '../database/client';
import { AppError, Errors, parse } from '../utils/errors';
import { cookieNames, cookieOpts, csrfTokenFor, requireSession } from '../middleware/security';
import { hit } from '../services/rate-limit.service';
import { audit } from '../services/audit.service';
import { confirmEnrollment, startEnrollment, verifyTotp } from '../services/totp.service';
import { markMfaVerified } from '../services/session.service';
import {
  changePasswordInput,
  forgotPasswordInput,
  loginInput,
  mfaEnrollConfirmInput,
  mfaVerifyInput,
  registerInput,
  resendVerificationInput,
  resetPasswordInput,
  verifyEmailInput,
} from '../../shared/schemas/auth';

const ACCEPTED = { ok: true } as const;

function setSession(req: FastifyRequest, reply: FastifyReply, s: { id: string; maxAgeSec: number }) {
  const { env } = req.ctx;
  reply.setCookie(cookieNames(env).sid, s.id, cookieOpts(env, s.maxAgeSec));
  // The anonymous CSRF cookie is no longer needed once a session exists.
  reply.clearCookie(cookieNames(env).anon, { path: '/' });
}

export const csrf = async (req: FastifyRequest, reply: FastifyReply) => ({
  csrfToken: csrfTokenFor(req, reply, req.ctx.env),
});

export async function register(req: FastifyRequest, reply: FastifyReply) {
  await svc.register(req.ctx, parse(registerInput, req.body), req.ip_raw);
  return reply.code(202).send({ ...ACCEPTED, message: 'Check your email to verify your account.' });
}
export async function resend(req: FastifyRequest, reply: FastifyReply) {
  await svc.resendVerification(req.ctx, parse(resendVerificationInput, req.body).email);
  return reply
    .code(202)
    .send({ ...ACCEPTED, message: 'If that account needs verification, a new link has been sent.' });
}
export async function verifyEmail(req: FastifyRequest) {
  await svc.verifyEmail(req.ctx, parse(verifyEmailInput, req.body).token);
  return ACCEPTED;
}

export async function login(req: FastifyRequest, reply: FastifyReply) {
  const { session, userId } = await svc.login(
    req.ctx,
    parse(loginInput, req.body),
    req.sessionId ?? undefined,
  );
  setSession(req, reply, session);
  const [row] = await req.ctx.db.select().from(schema.users).where(eq(schema.users.id, userId));
  return { ok: true, csrfToken: session.csrf, fullName: row?.fullName };
}

export async function logout(req: FastifyRequest, reply: FastifyReply) {
  const a = requireSession(req);
  await svc.logout(req.ctx, req.sessionId as string, { id: a.user.id, role: a.user.role });
  reply.clearCookie(cookieNames(req.ctx.env).sid, { path: '/' });
  return ACCEPTED;
}

export async function me(req: FastifyRequest, reply: FastifyReply) {
  const a = requireSession(req);
  return { user: await svc.toSessionUser(req.ctx.db, a), csrfToken: a.csrfSecret, _: reply.statusCode };
}

export async function forgot(req: FastifyRequest, reply: FastifyReply) {
  await svc.forgotPassword(req.ctx, parse(forgotPasswordInput, req.body).email);
  return reply
    .code(202)
    .send({ ...ACCEPTED, message: 'If an account exists for that email, a reset link has been sent.' });
}
export async function reset(req: FastifyRequest) {
  const i = parse(resetPasswordInput, req.body);
  await svc.resetPassword(req.ctx, i.token, i.password);
  return ACCEPTED;
}
export async function changePassword(req: FastifyRequest, reply: FastifyReply) {
  const a = requireSession(req);
  const i = parse(changePasswordInput, req.body);
  const s = await svc.changePassword(
    req.ctx,
    { id: a.user.id, role: a.user.role, passwordHash: a.user.passwordHash },
    i.currentPassword,
    i.newPassword,
  );
  setSession(req, reply, s);
  return { ok: true, csrfToken: s.csrf };
}

// ---- Admin TOTP ----
function adminOnly(req: FastifyRequest) {
  const a = requireSession(req);
  if (a.user.role !== 'admin') throw Errors.forbidden('Two-factor setup applies to administrator accounts.');
  return a;
}

export async function mfaEnroll(req: FastifyRequest) {
  const a = adminOnly(req);
  const r = await startEnrollment(
    req.ctx.db,
    { id: a.user.id, email: a.user.email },
    req.ctx.env.TOTP_ENCRYPTION_KEY,
  );
  if (r.alreadyEnrolled) throw new AppError(409, 'MFA_ALREADY_ENROLLED', 'Two-factor is already set up.');
  return { otpauth: r.otpauth, qrSvg: r.qrSvg, manualKey: r.manualKey };
}

export async function mfaEnrollConfirm(req: FastifyRequest) {
  const a = adminOnly(req);
  const { code } = parse(mfaEnrollConfirmInput, req.body);
  const r = await hit(req.ctx.db, `mfa:${a.user.id}`, 5, 300);
  if (!r.allowed) throw Errors.rateLimited(r.retryAfterSec);
  const codes = await confirmEnrollment(req.ctx.db, a.user.id, code, req.ctx.env.TOTP_ENCRYPTION_KEY);
  if (!codes) {
    await audit(req.ctx.db, {
      action: 'auth.mfa.failed',
      actorId: a.user.id,
      actorRole: 'admin',
      ipHash: req.ctx.ipHash,
      requestId: req.ctx.requestId,
    });
    throw new AppError(
      422,
      'MFA_CODE_INVALID',
      'That code is not valid. Check the time on your device and try again.',
    );
  }
  await markMfaVerified(req.ctx.db, a.idHash);
  await audit(req.ctx.db, {
    action: 'auth.mfa.enrolled',
    actorId: a.user.id,
    actorRole: 'admin',
    ipHash: req.ctx.ipHash,
    requestId: req.ctx.requestId,
  });
  return {
    ok: true,
    recoveryCodes: codes,
    notice: 'Store these recovery codes now. They are shown once and each works once.',
  };
}

export async function mfaVerify(req: FastifyRequest) {
  const a = adminOnly(req);
  const { code } = parse(mfaVerifyInput, req.body);
  const r = await hit(req.ctx.db, `mfa:${a.user.id}`, 5, 300);
  if (!r.allowed) throw Errors.rateLimited(r.retryAfterSec);
  const how = await verifyTotp(req.ctx.db, a.user.id, code, req.ctx.env.TOTP_ENCRYPTION_KEY);
  if (!how) {
    await audit(req.ctx.db, {
      action: 'auth.mfa.failed',
      actorId: a.user.id,
      actorRole: 'admin',
      ipHash: req.ctx.ipHash,
      requestId: req.ctx.requestId,
    });
    throw new AppError(422, 'MFA_CODE_INVALID', 'That code is not valid or was already used.');
  }
  await markMfaVerified(req.ctx.db, a.idHash);
  await audit(req.ctx.db, {
    action: how === 'recovery' ? 'auth.mfa.recovery_used' : 'auth.mfa.verified',
    actorId: a.user.id,
    actorRole: 'admin',
    ipHash: req.ctx.ipHash,
    requestId: req.ctx.requestId,
  });
  return ACCEPTED;
}
