import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { authenticator } from 'otplib';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../server/app';
import { loadEnv } from '../../server/env';
import { ConsoleDevMailer } from '../../server/adapters/mailer';
import { schema, type Db } from '../../server/database/client';
import { hashPassword } from '../../server/services/password.service';
import { decrypt } from '../../server/utils/crypto';

export const TEST_ENV = {
  NODE_ENV: 'test',
  SESSION_SECRET: 'x'.repeat(48),
  TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  APP_URL: 'http://localhost:5173',
  MAIL_TRANSPORT: 'console',
} as const;

export type Harness = Awaited<ReturnType<typeof makeHarness>>;

export async function makeHarness() {
  const pg = new PGlite();
  // pglite and node-postgres drizzle instances share the query API we use; cast is intentional (justified: test-only).
  const db = drizzle(pg, { schema }) as unknown as Db;
  await migrate(drizzle(pg), { migrationsFolder: 'server/database/migrations' });
  for (const name of ['admin', 'client'] as const)
    await db.insert(schema.roles).values({ name, description: name });
  const env = loadEnv({ ...TEST_ENV });
  const mailer = new ConsoleDevMailer();
  const app: FastifyInstance = await buildApp({ db, env, mailer });
  await app.ready();

  const cookieJar = new Map<string, string>();
  const jarHeader = () => [...cookieJar].map(([k, v]) => `${k}=${v}`).join('; ');
  const absorb = (setCookie: string | string[] | undefined) => {
    for (const c of [setCookie].flat().filter(Boolean) as string[]) {
      const [pair = ''] = c.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i);
      const v = pair.slice(i + 1);
      if (/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c) || v === '') cookieJar.delete(k);
      else cookieJar.set(k, v);
    }
  };

  /** A browser-like client with its own cookie jar and CSRF handling. */
  function client(ip = '10.0.0.1') {
    const jar = new Map<string, string>();
    const hdr = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const take = (sc: string | string[] | undefined) => {
      for (const c of [sc].flat().filter(Boolean) as string[]) {
        const [pair = ''] = c.split(';');
        const i = pair.indexOf('=');
        const k = pair.slice(0, i);
        const v = pair.slice(i + 1);
        if (/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c) || v === '') jar.delete(k);
        else jar.set(k, v);
      }
    };
    let csrf = '';
    const req = async (
      method: 'GET' | 'POST',
      url: string,
      body?: unknown,
      opts: { csrf?: string | null; headers?: Record<string, string> } = {},
    ) => {
      const headers: Record<string, string> = {
        cookie: hdr(),
        'x-forwarded-for': ip,
        ...(opts.headers ?? {}),
      };
      const token = opts.csrf === undefined ? csrf : opts.csrf;
      if (method !== 'GET' && token) headers['x-csrf-token'] = token;
      const res = await app.inject({
        method,
        url: `/api/v1${url}`,
        headers,
        ...(body !== undefined ? { payload: body as object } : {}),
      });
      take(res.headers['set-cookie']);
      let json: Record<string, unknown> = {};
      try {
        json = res.json();
      } catch {
        /* empty */
      }
      if (typeof json.csrfToken === 'string') csrf = json.csrfToken;
      return { status: res.statusCode, json, headers: res.headers, raw: res };
    };
    return {
      req,
      jar,
      get csrf() {
        return csrf;
      },
      setCsrf: (t: string) => {
        csrf = t;
      },
      async primeCsrf() {
        await req('GET', '/auth/csrf');
      },
      get: (u: string) => req('GET', u),
      post: (u: string, b?: unknown, o?: { csrf?: string | null; headers?: Record<string, string> }) =>
        req('POST', u, b ?? {}, o),
    };
  }

  async function createUser(opts: {
    email: string;
    password: string;
    role: 'admin' | 'client';
    verified?: boolean;
    name?: string;
  }) {
    const [role] = await db.select().from(schema.roles).where(eq(schema.roles.name, opts.role));
    const [u] = await db
      .insert(schema.users)
      .values({
        email: opts.email,
        passwordHash: await hashPassword(opts.password),
        roleId: role!.id,
        fullName: opts.name ?? 'Test User',
        status: opts.verified === false ? 'pending_verification' : 'active',
        emailVerifiedAt: opts.verified === false ? null : new Date(),
      })
      .returning();
    return u!;
  }

  async function login(c: ReturnType<typeof client>, email: string, password: string) {
    await c.primeCsrf();
    return c.post('/auth/login', { email, password });
  }

  /** Reads the TOTP secret straight from the DB (test-only) and produces a current code. */
  async function currentCode(userId: string) {
    const [row] = await db.select().from(schema.userTotp).where(eq(schema.userTotp.userId, userId));
    return authenticator.generate(decrypt(row!.secretEnc, TEST_ENV.TOTP_ENCRYPTION_KEY));
  }

  const lastToken = (template: string) => {
    const mail = [...mailer.sent].reverse().find((m) => m.subject.toLowerCase().includes(template));
    const m = mail?.text.match(/token=([\w-]+)/);
    return m?.[1];
  };

  const resetRateLimits = () => db.delete(schema.rateLimits);

  return {
    app,
    db,
    env,
    mailer,
    client,
    resetRateLimits,
    createUser,
    login,
    currentCode,
    lastToken,
    close: () => app.close(),
    _jar: { cookieJar, jarHeader, absorb },
  };
}
