import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

describe('authorization: negative cases', () => {
  it('anonymous callers get 401 on every admin endpoint', async () => {
    const c = h.client('10.9.0.1');
    await c.primeCsrf();
    expect((await c.get('/admin/users')).status).toBe(401);
    expect((await c.get('/admin/activity-logs')).status).toBe(401);
    expect((await c.post('/admin/users/00000000-0000-4000-8000-000000000000/disable')).status).toBe(401);
    expect((await c.get('/auth/me')).status).toBe(401);
  });

  it('a verified client gets 403 on every admin endpoint', async () => {
    await h.createUser({ email: 'client@example.com', password: PW, role: 'client' });
    const c = h.client('10.9.0.2');
    await h.login(c, 'client@example.com', PW);
    expect((await c.get('/admin/users')).status).toBe(403);
    expect((await c.get('/admin/activity-logs')).status).toBe(403);
    expect((await c.post('/admin/users/00000000-0000-4000-8000-000000000000/disable')).status).toBe(403);
    expect((await c.post('/auth/mfa/enroll')).status).toBe(403);
  });

  it('a disabled user with a live session is rejected immediately', async () => {
    const u = await h.createUser({ email: 'soon-disabled@example.com', password: PW, role: 'client' });
    const c = h.client('10.9.0.3');
    await h.login(c, 'soon-disabled@example.com', PW);
    expect((await c.get('/auth/me')).status).toBe(200);
    await h.db.update(schema.users).set({ status: 'disabled' }).where(eq(schema.users.id, u.id));
    expect((await c.get('/auth/me')).status).toBe(401);
  });

  it('state-changing authenticated requests need the session CSRF token', async () => {
    await h.createUser({ email: 'csrf-user@example.com', password: PW, role: 'client' });
    const c = h.client('10.9.0.4');
    await h.login(c, 'csrf-user@example.com', PW);
    expect((await c.post('/auth/logout', {}, { csrf: null })).status).toBe(403);
    expect((await c.post('/auth/logout', {}, { csrf: 'nope' })).status).toBe(403);
    expect((await c.post('/auth/logout', {}, { headers: { origin: 'https://evil.example' } })).status).toBe(
      403,
    );
    expect((await c.post('/auth/logout')).status).toBe(200);
  });
});

describe('admin TOTP', () => {
  const email = 'admin@example.com';
  // MFA attempts are limited to 5 per 5 minutes per admin; isolate each test from the previous one's attempts.
  beforeEach(async () => {
    await h.resetRateLimits();
  });

  it('blocks admin resources until TOTP is enrolled and verified for the session', async () => {
    const admin = await h.createUser({ email, password: PW, role: 'admin' });
    const c = h.client('10.10.0.1');
    await h.login(c, email, PW);

    const me = await c.get('/auth/me');
    expect((me.json.user as { mfa: string }).mfa).toBe('enrollment_required');
    const blocked = await c.get('/admin/users');
    expect(blocked.status).toBe(403);
    expect(blocked.json.code).toBe('MFA_REQUIRED');

    const enroll = await c.post('/auth/mfa/enroll');
    expect(enroll.status).toBe(200);
    expect(String(enroll.json.qrSvg)).toContain('<svg');
    const [stored] = await h.db.select().from(schema.userTotp).where(eq(schema.userTotp.userId, admin.id));
    expect(stored?.secretEnc).not.toContain(String(enroll.json.manualKey)); // encrypted at rest

    expect((await c.post('/auth/mfa/enroll/confirm', { code: '000000' })).status).toBe(422);
    const confirm = await c.post('/auth/mfa/enroll/confirm', { code: await h.currentCode(admin.id) });
    expect(confirm.status).toBe(200);
    expect(confirm.json.recoveryCodes).toHaveLength(10);
    expect((await c.get('/admin/users')).status).toBe(200);
    expect((await c.get('/admin/activity-logs')).status).toBe(200);
  });

  it('requires a code on each new login and rejects replay of a used code', async () => {
    const [admin] = await h.db.select().from(schema.users).where(eq(schema.users.email, email));
    const c = h.client('10.10.0.2');
    await h.login(c, email, PW);
    expect(((await c.get('/auth/me')).json.user as { mfa: string }).mfa).toBe('verification_required');
    expect((await c.get('/admin/users')).json.code).toBe('MFA_REQUIRED');
    expect((await c.post('/auth/mfa/verify', { code: '123456' })).status).toBe(422);
    const code = await h.currentCode(admin!.id);
    // The enrollment step already consumed the current time-step, so the same code is a replay.
    expect((await c.post('/auth/mfa/verify', { code })).status).toBe(422);
  });

  it('accepts each recovery code once', async () => {
    const [admin] = await h.db.select().from(schema.users).where(eq(schema.users.email, email));
    // Re-issue codes through a fresh enrollment-less path: seed one known code directly (test-only).
    const { sha256 } = await import('../../server/utils/crypto');
    await h.db.insert(schema.recoveryCodes).values({ userId: admin!.id, codeHash: sha256('TESTCODE1') });
    const c = h.client('10.10.0.3');
    await h.login(c, email, PW);
    expect((await c.post('/auth/mfa/verify', { code: 'TESTCODE1' })).status).toBe(200);
    expect((await c.get('/admin/users')).status).toBe(200);
    const c2 = h.client('10.10.0.4');
    await h.login(c2, email, PW);
    expect((await c2.post('/auth/mfa/verify', { code: 'TESTCODE1' })).status).toBe(422);
  });

  it('rate-limits MFA attempts', async () => {
    const c = h.client('10.10.0.5');
    await h.login(c, email, PW);
    let last = 0;
    for (let i = 0; i < 7; i++) last = (await c.post('/auth/mfa/verify', { code: '654321' })).status;
    expect(last).toBe(429);
  });

  it('admin actions are audited and revoke the target sessions', async () => {
    const [admin] = await h.db.select().from(schema.users).where(eq(schema.users.email, email));
    const victim = await h.createUser({ email: 'victim@example.com', password: PW, role: 'client' });
    const vc = h.client('10.10.0.6');
    await h.login(vc, 'victim@example.com', PW);

    const { sha256 } = await import('../../server/utils/crypto');
    await h.db.insert(schema.recoveryCodes).values({ userId: admin!.id, codeHash: sha256('TESTCODE2') });
    const c = h.client('10.10.0.7');
    await h.login(c, email, PW);
    await c.post('/auth/mfa/verify', { code: 'TESTCODE2' });

    expect((await c.post(`/admin/users/${victim.id}/disable`)).status).toBe(200);
    expect((await vc.get('/auth/me')).status).toBe(401);
    expect((await c.post(`/admin/users/${admin!.id}/disable`)).status).toBe(409); // cannot disable self
    expect((await c.post('/admin/users/not-a-uuid/disable')).status).toBe(422);
    const logs = await h.db
      .select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.action, 'admin.user.disabled'));
    expect(logs).toHaveLength(1);
    expect(logs[0]?.actorId).toBe(admin!.id);
  });
});

describe('error format', () => {
  it('returns problem+json with a request id and no internals', async () => {
    const c = h.client('10.11.0.1');
    const r = await c.get('/does-not-exist');
    expect(r.status).toBe(404);
    expect(r.headers['content-type']).toContain('application/problem+json');
    expect(r.json.requestId).toBeTruthy();
    const csp = String(r.headers['content-security-policy']);
    expect(csp).toContain("default-src 'none'");
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
  });
  it('rejects oversized and wrong-content-type bodies', async () => {
    const c = h.client('10.11.0.2');
    await c.primeCsrf();
    const big = await h.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': c.csrf,
        cookie: [...c.jar].map(([k, v]) => `${k}=${v}`).join('; '),
      },
      payload: JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(100_000) }),
    });
    expect(big.statusCode).toBe(413);
  });
});

describe('break-glass MFA reset (CLI service)', () => {
  it('clears TOTP, recovery codes and sessions, and forces re-enrollment; refuses non-admins', async () => {
    const { resetAdminMfa } = await import('../../server/services/totp.service');
    const [admin] = await h.db.select().from(schema.users).where(eq(schema.users.email, 'admin@example.com'));
    await h.resetRateLimits();
    const live = h.client('10.12.0.1');
    await h.login(live, 'admin@example.com', PW);
    expect(await resetAdminMfa(h.db, 'client@example.com')).toBe(false); // a client is not touched
    expect(await resetAdminMfa(h.db, 'ADMIN@example.com')).toBe(true);
    expect(
      await h.db.select().from(schema.userTotp).where(eq(schema.userTotp.userId, admin!.id)),
    ).toHaveLength(0);
    expect(
      await h.db.select().from(schema.recoveryCodes).where(eq(schema.recoveryCodes.userId, admin!.id)),
    ).toHaveLength(0);
    expect((await live.get('/auth/me')).status).toBe(401);
    const again = h.client('10.12.0.2');
    await h.login(again, 'admin@example.com', PW);
    expect(((await again.get('/auth/me')).json.user as { mfa: string }).mfa).toBe('enrollment_required');
  });
});
