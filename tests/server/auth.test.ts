import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeHarness, type Harness } from './helpers';
import { schema } from '../../server/database/client';

let h: Harness;
beforeAll(async () => {
  h = await makeHarness();
});
afterAll(async () => {
  await h.close();
});

const PW = 'correct horse battery staple';
const reg = (email: string, extra: Record<string, unknown> = {}) => ({
  fullName: 'Ada Lovelace',
  email,
  password: PW,
  consent: true,
  ...extra,
});

describe('registration and email verification', () => {
  it('rejects weak passwords, unknown keys and missing consent with 422 field errors', async () => {
    const c = h.client('10.1.0.1');
    await c.primeCsrf();
    const r1 = await c.post('/auth/register', reg('a@example.com', { password: 'short' }));
    expect(r1.status).toBe(422);
    expect(r1.json.code).toBe('VALIDATION_FAILED');
    expect(JSON.stringify(r1.json.errors)).toContain('password');
    expect((await c.post('/auth/register', { ...reg('a@example.com'), isAdmin: true })).status).toBe(422);
    expect((await c.post('/auth/register', reg('a@example.com', { consent: false }))).status).toBe(422);
  });

  it('requires a CSRF token even for anonymous endpoints', async () => {
    const c = h.client('10.1.0.2');
    expect((await c.post('/auth/register', reg('csrf@example.com'), { csrf: null })).status).toBe(403);
    await c.primeCsrf();
    expect((await c.post('/auth/register', reg('csrf@example.com'), { csrf: 'forged' })).status).toBe(403);
  });

  it('registers, blocks login until verified, then verifies once only', async () => {
    const c = h.client('10.1.0.3');
    await c.primeCsrf();
    const r = await c.post('/auth/register', reg('ada@example.com'));
    expect(r.status).toBe(202);
    const token = h.lastToken('verify');
    expect(token).toBeTruthy();

    const blocked = await h.login(c, 'ada@example.com', PW);
    expect(blocked.status).toBe(403);
    expect(blocked.json.code).toBe('EMAIL_NOT_VERIFIED');

    await c.primeCsrf();
    expect((await c.post('/auth/verify-email', { token })).status).toBe(200);
    expect((await c.post('/auth/verify-email', { token })).status).toBe(400); // single use
    const ok = await h.login(c, 'ada@example.com', PW);
    expect(ok.status).toBe(200);

    const [u] = await h.db.select().from(schema.users).where(eq(schema.users.email, 'ada@example.com'));
    expect(u?.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(u?.passwordHash).not.toContain(PW);
    const clients = await h.db.select().from(schema.clients).where(eq(schema.clients.userId, u!.id));
    expect(clients).toHaveLength(1);
  });

  it('responds identically for an already-registered email (no enumeration) and emails the owner', async () => {
    const c = h.client('10.1.0.4');
    await c.primeCsrf();
    const before = h.mailer.sent.length;
    const r = await c.post('/auth/register', reg('ada@example.com'));
    expect(r.status).toBe(202);
    expect(h.mailer.sent.length).toBe(before + 1);
    expect(h.mailer.sent.at(-1)?.text).toContain('account already exists');
  });

  it('silently ignores honeypot submissions without creating users', async () => {
    const c = h.client('10.1.0.5');
    await c.primeCsrf();
    const r = await c.post('/auth/register', reg('bot@example.com', { website: 'http://spam' }));
    expect(r.status).toBe(202);
    expect(
      await h.db.select().from(schema.users).where(eq(schema.users.email, 'bot@example.com')),
    ).toHaveLength(0);
  });
});

describe('login, sessions and lockout', () => {
  it('sets HttpOnly SameSite session cookie and returns the user via /auth/me', async () => {
    await h.createUser({ email: 'sam@example.com', password: PW, role: 'client' });
    const c = h.client('10.2.0.1');
    const r = await h.login(c, 'sam@example.com', PW);
    expect(r.status).toBe(200);
    const sc = ([] as string[]).concat(r.headers['set-cookie'] ?? []).find((x) => x.startsWith('sid='))!;
    expect(sc).toMatch(/HttpOnly/i);
    expect(sc).toMatch(/SameSite=Lax/i);
    const me = await c.get('/auth/me');
    expect(me.status).toBe(200);
    expect((me.json.user as { role: string }).role).toBe('client');
    expect((me.json.user as { mfa: string }).mfa).toBe('not_required');
  });

  it('returns the same response for unknown email and wrong password', async () => {
    const c = h.client('10.2.0.2');
    const a = await h.login(c, 'nobody@example.com', PW);
    const b = await h.login(c, 'sam@example.com', 'wrong password here');
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.json.code).toBe(b.json.code);
    expect(a.json.title).toBe(b.json.title);
  });

  it('rotates the session id on login and revokes the previous one', async () => {
    const c = h.client('10.2.0.3');
    await h.login(c, 'sam@example.com', PW);
    const first = c.jar.get('sid')!;
    expect((await c.post('/auth/login', { email: 'sam@example.com', password: PW })).status).toBe(200);
    const second = c.jar.get('sid')!;
    expect(second).not.toBe(first);
    const old = h.client('10.2.0.3');
    old.jar.set('sid', first);
    expect((await old.get('/auth/me')).status).toBe(401);
  });

  it('logout revokes the session server-side', async () => {
    const c = h.client('10.2.0.4');
    await h.login(c, 'sam@example.com', PW);
    const sid = c.jar.get('sid')!;
    expect((await c.post('/auth/logout')).status).toBe(200);
    const replay = h.client('10.2.0.4');
    replay.jar.set('sid', sid);
    expect((await replay.get('/auth/me')).status).toBe(401);
  });

  it('locks the account after 5 failures, even for the correct password, with a uniform response', async () => {
    await h.createUser({ email: 'lock@example.com', password: PW, role: 'client' });
    for (let i = 0; i < 5; i++) {
      const c = h.client(`10.3.0.${i + 1}`); // different IPs so only the account lockout is under test
      expect((await h.login(c, 'lock@example.com', 'bad password 12345')).status).toBe(401);
    }
    const c = h.client('10.3.0.99');
    const r = await h.login(c, 'lock@example.com', PW);
    expect(r.status).toBe(401);
    expect(r.json.code).toBe('INVALID_CREDENTIALS');
    const [u] = await h.db.select().from(schema.users).where(eq(schema.users.email, 'lock@example.com'));
    expect(u?.lockedUntil).toBeTruthy();
  });

  it('rate-limits repeated attempts per IP+email with 429 and Retry-After', async () => {
    const c = h.client('10.4.0.1');
    let last = 0;
    let hdr: unknown;
    for (let i = 0; i < 7; i++) {
      const r = await h.login(c, 'ratelimit@example.com', 'bad password 12345');
      last = r.status;
      hdr = r.headers['retry-after'];
    }
    expect(last).toBe(429);
    expect(Number(hdr)).toBeGreaterThan(0);
  });

  it('expires sessions after the idle timeout and the absolute timeout', async () => {
    const c = h.client('10.5.0.1');
    await h.login(c, 'sam@example.com', PW);
    const [u] = await h.db.select().from(schema.users).where(eq(schema.users.email, 'sam@example.com'));
    await h.db
      .update(schema.sessions)
      .set({ idleExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.sessions.userId, u!.id));
    expect((await c.get('/auth/me')).status).toBe(401);

    const c2 = h.client('10.5.0.2');
    await h.login(c2, 'sam@example.com', PW);
    await h.db
      .update(schema.sessions)
      .set({ absoluteExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.sessions.userId, u!.id));
    expect((await c2.get('/auth/me')).status).toBe(401);
  });
});

describe('password reset and change', () => {
  it('gives the same response for unknown and known emails; reset is single-use and revokes sessions', async () => {
    const user = await h.createUser({ email: 'reset@example.com', password: PW, role: 'client' });
    const live = h.client('10.6.0.1');
    await h.login(live, 'reset@example.com', PW);

    const c = h.client('10.6.0.2');
    await c.primeCsrf();
    const a = await c.post('/auth/forgot-password', { email: 'nobody-here@example.com' });
    const b = await c.post('/auth/forgot-password', { email: 'reset@example.com' });
    expect(a.status).toBe(202);
    expect(b.status).toBe(202);
    expect(a.json.message).toBe(b.json.message);

    const token = h.lastToken('reset');
    const newPw = 'a brand new long passphrase';
    expect((await c.post('/auth/reset-password', { token, password: newPw })).status).toBe(200);
    expect((await c.post('/auth/reset-password', { token, password: newPw })).status).toBe(400);
    expect((await live.get('/auth/me')).status).toBe(401); // old sessions revoked
    expect((await h.login(h.client('10.6.0.3'), 'reset@example.com', newPw)).status).toBe(200);
    void user;
  });

  it('change-password requires the current password and rotates the session', async () => {
    await h.createUser({ email: 'chg@example.com', password: PW, role: 'client' });
    const c = h.client('10.7.0.1');
    await h.login(c, 'chg@example.com', PW);
    const before = c.jar.get('sid');
    expect(
      (
        await c.post('/auth/change-password', {
          currentPassword: 'wrong wrong wrong',
          newPassword: 'another long passphrase 1',
        })
      ).status,
    ).toBe(403);
    const ok = await c.post('/auth/change-password', {
      currentPassword: PW,
      newPassword: 'another long passphrase 1',
    });
    expect(ok.status).toBe(200);
    expect(c.jar.get('sid')).not.toBe(before);
    expect((await c.get('/auth/me')).status).toBe(200);
  });
});

describe('audit log', () => {
  it('records auth events without secrets', async () => {
    const logs = await h.db.select().from(schema.activityLogs);
    const actions = new Set(logs.map((l) => l.action));
    for (const a of [
      'auth.register',
      'auth.verify_email',
      'auth.login.success',
      'auth.login.failed',
      'auth.login.locked',
      'auth.logout',
    ])
      expect(actions.has(a)).toBe(true);
    const blob = JSON.stringify(logs);
    expect(blob).not.toContain(PW);
    expect(blob).not.toMatch(/argon2/);
  });
});
