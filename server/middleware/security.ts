import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { Db } from '../database/client';
import type { Env } from '../env';
import type { Mailer } from '../adapters/mailer';
import type { Storage } from '../adapters/storage';
import { hmac, randomToken, safeEqual, sha256 } from '../utils/crypto';
import { AppError, Errors } from '../utils/errors';
import { loadSession } from '../services/session.service';
import { can } from '../services/policy';

export type Deps = { db: Db; env: Env; mailer: Mailer; storage: Storage };

export const cookieNames = (env: Env) =>
  env.isProd ? { sid: '__Host-sid', anon: '__Host-csrf' } : { sid: 'sid', anon: 'csrf' };

export function cookieOpts(env: Env, maxAgeSec?: number) {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax' as const,
    path: '/',
    ...(maxAgeSec ? { maxAge: maxAgeSec } : {}),
  };
}

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Anonymous CSRF token = HMAC(secret, cookie value): stateless, bound to a cookie the attacker cannot read. */
export function anonCsrfToken(env: Env, cookieValue: string) {
  return hmac(env.SESSION_SECRET, `anon:${cookieValue}`);
}

export function csrfTokenFor(req: FastifyRequest, reply: FastifyReply, env: Env): string {
  if (req.auth) return req.auth.csrfSecret;
  const names = cookieNames(env);
  let v = req.cookies[names.anon];
  if (!v) {
    v = randomToken(24);
    reply.setCookie(names.anon, v, cookieOpts(env, 60 * 60 * 24));
  }
  return anonCsrfToken(env, v);
}

export function registerSecurity(app: FastifyInstance, { db, env, mailer, storage }: Deps) {
  const names = cookieNames(env);
  const appOrigin = new URL(env.APP_URL).origin;

  app.decorateRequest('auth', null);
  app.decorateRequest('sessionId', null);
  app.decorateRequest('ip_raw', '');
  app.decorateRequest('ctx', null as never);

  app.addHook('onRequest', async (req) => {
    req.ip_raw = req.ip;
    req.ctx = {
      db,
      env,
      mailer,
      storage,
      ipHash: hmac(env.SESSION_SECRET, `ip:${req.ip}`).slice(0, 32),
      userAgentHash: sha256(String(req.headers['user-agent'] ?? '')).slice(0, 32),
      requestId: String(req.headers['x-request-id'] ?? randomUUID()),
    };
    const sid = req.cookies?.[names.sid];
    if (sid) {
      const s = await loadSession(db, sid);
      if (s) {
        req.auth = s;
        req.sessionId = sid;
      }
    }
  });

  app.addHook('onSend', async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Request-Id', req.ctx?.requestId ?? '');
  });

  // CSRF: every state-changing route, authenticated or not.
  app.addHook('preHandler', async (req) => {
    if (SAFE.has(req.method)) return;
    const origin = req.headers.origin;
    if (origin && origin !== appOrigin) throw Errors.csrf();
    const header = req.headers['x-csrf-token'];
    if (typeof header !== 'string' || !header) throw Errors.csrf();
    const expected = req.auth
      ? req.auth.csrfSecret
      : (() => {
          const c = req.cookies?.[names.anon];
          return c ? anonCsrfToken(env, c) : '';
        })();
    if (!expected || !safeEqual(header, expected)) throw Errors.csrf();
  });
}

/**
 * Server-side authorization. The UI hiding a button is never authorization.
 * Admin resources additionally require a verified TOTP for this session.
 */
export function authorize(req: FastifyRequest, resource: string, action: string) {
  const a = req.auth;
  if (!a) throw Errors.unauthenticated();
  if (a.user.status !== 'active' || !a.user.emailVerifiedAt)
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email first.');
  if (!can(a.user.role, resource, action)) throw Errors.forbidden();
  if (a.user.role === 'admin' && !a.mfaVerifiedAt)
    throw new AppError(403, 'MFA_REQUIRED', 'Two-factor verification is required.');
  return a;
}

/** For endpoints reachable before MFA is complete (enrollment/verification only). */
export function requireSession(req: FastifyRequest) {
  if (!req.auth) throw Errors.unauthenticated();
  return req.auth;
}
