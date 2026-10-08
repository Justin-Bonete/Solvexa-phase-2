import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeHarness, type Harness } from './helpers';
import { schema } from '../../server/database/client';
import { hit } from '../../server/services/rate-limit.service';
import { sha256 } from '../../server/utils/crypto';
import { MAX_FILE_BYTES } from '../../shared/uploads';

let h: Harness;
let adminEmail: string;
const PW = 'correct horse battery staple';
let ipCounter = 0;
const ip = () => `172.16.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

beforeAll(async () => {
  h = await makeHarness();
  adminEmail = 'inbox-admin@example.com';
  await h.createUser({ email: adminEmail, password: PW, role: 'admin' });
});
afterAll(async () => {
  await h.close();
});

const body = (o: Record<string, unknown> = {}) => ({
  path: 'new',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  projectType: 'business_system',
  hasExistingSystem: false,
  description: 'I need an inventory system for three branches.',
  consent: true,
  startedAt: Date.now() - 20_000,
  ...o,
});
const assessment = (o: Record<string, unknown> = {}) => ({
  fullName: 'Grace Hopper',
  email: 'grace@example.com',
  currentSystem: 'Grading portal',
  problems: 'It crashes when teachers upload grades.',
  isOnline: 'partially',
  hasSourceAccess: 'yes',
  hasServerAccess: 'unsure',
  hasDbAccess: 'no',
  desiredImprovements: 'Faster pages and a mobile layout.',
  consent: true,
  startedAt: Date.now() - 20_000,
  ...o,
});

async function submit(
  path: '/inquiries' | '/assessments',
  payload: unknown,
  opts: { ip?: string; headers?: Record<string, string>; csrf?: string | null } = {},
) {
  const c = h.client(opts.ip ?? ip());
  await c.primeCsrf();
  return {
    c,
    res: await c.post(path, payload, { csrf: opts.csrf, ...(opts.headers ? { headers: opts.headers } : {}) }),
  };
}

// ---------- upload helpers ----------
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
);
function multipart(filename: string, data: Buffer) {
  const boundary = `----t${randomUUID()}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
  );
  return {
    payload: Buffer.concat([head, data, Buffer.from(`\r\n--${boundary}--\r\n`)]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
async function upload(
  c: ReturnType<Harness['client']>,
  id: string,
  token: string | undefined,
  filename: string,
  data: Buffer,
  ipAddr = '10.99.0.1',
) {
  const m = multipart(filename, data);
  const headers: Record<string, string> = {
    cookie: [...c.jar].map(([k, v]) => `${k}=${v}`).join('; '),
    'x-forwarded-for': ipAddr,
    'x-csrf-token': c.csrf,
    'content-type': m.contentType,
  };
  if (token) headers['x-upload-token'] = token;
  const res = await h.app.inject({
    method: 'POST',
    url: `/api/v1/inquiries/${id}/attachments`,
    headers,
    payload: m.payload,
  });
  let json: Record<string, unknown> = {};
  try {
    json = res.json();
  } catch {
    /* empty */
  }
  return { status: res.statusCode, json };
}
async function created(ipAddr = ip()) {
  const { c, res } = await submit('/inquiries', body(), { ip: ipAddr });
  expect(res.status).toBe(201);
  return { c, id: res.json.id as string, token: res.json.uploadToken as string, ip: ipAddr };
}

async function adminClient() {
  await h.resetRateLimits();
  const c = h.client(ip());
  expect((await h.login(c, adminEmail, PW)).status).toBe(200);
  const [admin] = await h.db.select().from(schema.users).where(eq(schema.users.email, adminEmail));
  const code = `RC${randomUUID().slice(0, 8).toUpperCase()}`;
  await h.db.insert(schema.recoveryCodes).values({ userId: admin!.id, codeHash: sha256(code) });
  expect((await c.post('/auth/mfa/verify', { code })).status).toBe(200);
  return c;
}

describe('inquiry submission', () => {
  it('saves the request, returns a reference only after the save, audits it, and notifies both sides', async () => {
    const before = h.mailer.sent.length;
    const { res } = await submit(
      '/inquiries',
      body({
        organization: 'Acme School',
        budgetAmount: 150000,
        budgetCurrency: 'PHP',
        timeline: 'one_to_three_months',
      }),
    );
    expect(res.status).toBe(201);
    expect(res.json.reference).toMatch(/^INQ-\d{4}-\d{6}$/);
    expect(res.json.uploadToken).toBeTruthy();
    expect(res.json.emailStatus).toBe('sent');
    const [row] = await h.db
      .select()
      .from(schema.projectRequests)
      .where(eq(schema.projectRequests.id, res.json.id as string));
    expect(row).toMatchObject({
      status: 'new',
      kind: 'inquiry',
      contactEmail: 'ada@example.com',
      budgetAmount: 150000,
      budgetCurrency: 'PHP',
      organization: 'Acme School',
      clientId: null,
    });
    expect(row?.consentAt).toBeInstanceOf(Date);
    const sent = h.mailer.sent.slice(before);
    expect(
      sent.some((m) => m.to === 'ada@example.com' && m.text.includes(res.json.reference as string)),
    ).toBe(true);
    expect(sent.some((m) => m.to === adminEmail && m.text.includes(`/admin/inquiries/${res.json.id}`))).toBe(
      true,
    );
    const logs = await h.db
      .select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.action, 'inquiry.created'));
    expect(logs.length).toBeGreaterThan(0);
  });

  it('hands out increasing, unique references', async () => {
    const a = (await submit('/inquiries', body())).res.json.reference as string;
    const b = (await submit('/inquiries', body())).res.json.reference as string;
    expect(a).not.toBe(b);
    expect(Number(b.slice(-6))).toBeGreaterThan(Number(a.slice(-6)));
  });

  it('rejects invalid input with per-field errors', async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ consent: false }, 'consent'],
      [{ description: 'too short' }, 'description'],
      [{ email: 'nope' }, 'email'],
      [{ systemUrl: 'javascript:alert(1)' }, 'systemUrl'],
      [{ budgetAmount: 500 }, 'budgetCurrency'],
      [{ projectType: 'hacking' }, 'projectType'],
      [{ path: 'existing', hasExistingSystem: false }, 'hasExistingSystem'],
      [{ phone: 'call <b>me</b>' }, 'phone'],
    ];
    for (const [o, field] of cases) {
      const { res } = await submit('/inquiries', body(o));
      expect(res.status, field).toBe(422);
      expect(JSON.stringify(res.json.errors), field).toContain(field);
    }
    expect((await submit('/inquiries', { ...body(), isAdmin: true })).res.status).toBe(422); // unknown keys refused
  });

  it('requires a CSRF token even for anonymous visitors', async () => {
    expect((await submit('/inquiries', body(), { csrf: null })).res.status).toBe(403);
    expect((await submit('/inquiries', body(), { csrf: 'forged' })).res.status).toBe(403);
  });

  it('treats honeypot, instant, and timestamp-less submissions as bots: no row, no reference', async () => {
    const count = async () => (await h.db.select().from(schema.projectRequests)).length;
    const n = await count();
    for (const o of [
      { website: 'http://spam.example' },
      { startedAt: Date.now() },
      { startedAt: undefined },
      { startedAt: Date.now() - 3 * 86_400_000 },
    ]) {
      const { res } = await submit('/inquiries', body(o));
      expect(res.status).toBe(202);
      expect(res.json.reference).toBeUndefined();
    }
    expect(await count()).toBe(n);
  });

  it('rate-limits per IP', async () => {
    const same = ip();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await submit('/inquiries', body(), { ip: same })).res.status);
    expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it('is idempotent: the same key never creates a second request', async () => {
    const key = randomUUID();
    const a = await submit('/inquiries', body(), { headers: { 'idempotency-key': key } });
    const b = await submit('/inquiries', body(), { headers: { 'idempotency-key': key } });
    expect(b.res.json.reference).toBe(a.res.json.reference);
    expect(b.res.json.id).toBe(a.res.json.id);
    expect(
      await h.db.select().from(schema.projectRequests).where(eq(schema.projectRequests.idempotencyKey, key)),
    ).toHaveLength(1);
    expect((await submit('/inquiries', body(), { headers: { 'idempotency-key': 'short' } })).res.status).toBe(
      422,
    );
  });

  it('drops existing-system fields when the visitor has no existing system', async () => {
    const { res } = await submit(
      '/inquiries',
      body({ hasExistingSystem: false, currentTechnology: 'PHP 5', systemUrl: 'https://old.example.com' }),
    );
    const [row] = await h.db
      .select()
      .from(schema.projectRequests)
      .where(eq(schema.projectRequests.id, res.json.id as string));
    expect(row?.currentTechnology).toBeNull();
    expect(row?.systemUrl).toBeNull();
    const kept = await submit(
      '/inquiries',
      body({
        path: 'existing',
        hasExistingSystem: true,
        currentTechnology: 'PHP 5',
        systemUrl: 'https://old.example.com',
      }),
    );
    const [row2] = await h.db
      .select()
      .from(schema.projectRequests)
      .where(eq(schema.projectRequests.id, kept.res.json.id as string));
    expect(row2).toMatchObject({
      currentTechnology: 'PHP 5',
      systemUrl: 'https://old.example.com',
      path: 'existing',
    });
  });

  it('links the request to the client account when signed in', async () => {
    await h.resetRateLimits();
    const u = await h.createUser({ email: 'linked@example.com', password: PW, role: 'client' });
    await h.db.insert(schema.clients).values({ userId: u.id });
    const c = h.client(ip());
    await h.login(c, 'linked@example.com', PW);
    const res = await c.post('/inquiries', body({ email: 'linked@example.com' }));
    expect(res.status).toBe(201);
    const [row] = await h.db
      .select()
      .from(schema.projectRequests)
      .where(eq(schema.projectRequests.id, res.json.id as string));
    const [client] = await h.db.select().from(schema.clients).where(eq(schema.clients.userId, u.id));
    expect(row?.clientId).toBe(client?.id);
  });

  it('still saves the request when email fails, and says so honestly', async () => {
    const spy = vi.spyOn(h.mailer, 'send').mockRejectedValue(new Error('smtp down'));
    const { res } = await submit('/inquiries', body());
    spy.mockRestore();
    expect(res.status).toBe(201);
    expect(res.json.reference).toBeTruthy();
    expect(res.json.emailStatus).toBe('failed');
    const failed = await h.db
      .select()
      .from(schema.emailOutbox)
      .where(eq(schema.emailOutbox.status, 'failed'));
    expect(failed.length).toBeGreaterThan(0);
  });

  it('still saves the request when the daily email budget is used up', async () => {
    for (let i = 0; i < 91; i++) await hit(h.db, 'mail:daily', 90, 86_400);
    const { res } = await submit('/inquiries', body());
    expect(res.status).toBe(201);
    expect(res.json.emailStatus).toBe('budget_exhausted');
    await h.resetRateLimits();
  });

  it('cannot inject extra lines into email subjects through the name', async () => {
    const before = h.mailer.sent.length;
    await submit('/inquiries', body({ fullName: 'Ada\r\nBcc: attacker@evil.example' }));
    for (const m of h.mailer.sent.slice(before)) expect(m.subject).not.toMatch(/[\r\n]/);
  });
});

describe('system assessment', () => {
  it('creates the request and its assessment together with an ASM reference', async () => {
    const { res } = await submit('/assessments', assessment());
    expect(res.status).toBe(201);
    expect(res.json.reference).toMatch(/^ASM-\d{4}-\d{6}$/);
    const [req] = await h.db
      .select()
      .from(schema.projectRequests)
      .where(eq(schema.projectRequests.id, res.json.id as string));
    const [asm] = await h.db
      .select()
      .from(schema.systemAssessments)
      .where(eq(schema.systemAssessments.requestId, res.json.id as string));
    expect(req).toMatchObject({ kind: 'assessment', path: 'existing', hasExistingSystem: true });
    expect(asm).toMatchObject({
      isOnline: 'partially',
      hasSourceAccess: 'yes',
      hasServerAccess: 'unsure',
      hasDbAccess: 'no',
    });
  });

  it('never accepts credentials: access is yes/no/unsure only and unknown fields are refused', async () => {
    expect((await submit('/assessments', assessment({ serverPassword: 'hunter2' }))).res.status).toBe(422);
    expect((await submit('/assessments', assessment({ hasServerAccess: 'root:hunter2' }))).res.status).toBe(
      422,
    );
    expect((await submit('/assessments', assessment({ isOnline: 'maybe' }))).res.status).toBe(422);
    expect((await submit('/assessments', assessment({ problems: 'short' }))).res.status).toBe(422);
  });
});

describe('attachment uploads', () => {
  it('accepts a real PNG and stores it privately under a random key', async () => {
    const r = await created();
    const up = await upload(r.c, r.id, r.token, 'screenshot.png', PNG, r.ip);
    expect(up.status).toBe(201);
    const [row] = await h.db.select().from(schema.attachments).where(eq(schema.attachments.requestId, r.id));
    expect(row).toMatchObject({
      originalName: 'screenshot.png',
      mime: 'image/png',
      sizeBytes: PNG.length,
      scanStatus: 'not_scanned',
    });
    expect(row?.sha256).toHaveLength(64);
    expect(row?.storageKey).not.toContain('screenshot');
    expect(row?.storageKey).toMatch(/^requests\/[0-9a-f-]{36}\/[0-9a-f]{32}$/);
    expect(h.storage.files.get(row!.storageKey)?.data.equals(PNG)).toBe(true);
  });

  it('requires a valid upload token bound to that exact request', async () => {
    const a = await created();
    const b = await created();
    expect((await upload(a.c, a.id, undefined, 'a.png', PNG, a.ip)).status).toBe(403);
    expect((await upload(a.c, a.id, 'garbage', 'a.png', PNG, a.ip)).status).toBe(403);
    expect((await upload(a.c, a.id, b.token, 'a.png', PNG, a.ip)).status).toBe(403); // token from another request
    const [exp, sig] = a.token.split('.');
    expect((await upload(a.c, a.id, `${Number(exp) - 7_200_000}.${sig}`, 'a.png', PNG, a.ip)).status).toBe(
      403,
    ); // tampered expiry
  });

  it('rejects files whose content does not match their extension, and types off the allowlist', async () => {
    const r = await created();
    const pe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200, 1)]);
    const cases: [string, Buffer, number, string][] = [
      ['evil.png', pe, 422, 'UPLOAD_CONTENT_MISMATCH'],
      ['pdf-as-png.png', PDF, 422, 'UPLOAD_CONTENT_MISMATCH'],
      ['png-as-pdf.pdf', PNG, 422, 'UPLOAD_CONTENT_MISMATCH'],
      [
        'fake.docx',
        Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.alloc(100, 7)]),
        422,
        'UPLOAD_CONTENT_MISMATCH',
      ],
      ['shell.exe', pe, 422, 'UPLOAD_TYPE_NOT_ALLOWED'],
      ['xss.svg', Buffer.from('<svg onload=alert(1)/>'), 422, 'UPLOAD_TYPE_NOT_ALLOWED'],
      ['noext', PNG, 422, 'UPLOAD_TYPE_NOT_ALLOWED'],
      ['page.html', Buffer.from('<script>1</script>'), 422, 'UPLOAD_TYPE_NOT_ALLOWED'],
      ['binary.txt', Buffer.from([0x68, 0x69, 0x00, 0x01, 0x02]), 422, 'UPLOAD_CONTENT_MISMATCH'],
      ['png-as-txt.txt', PNG, 422, 'UPLOAD_CONTENT_MISMATCH'],
      ['empty.png', Buffer.alloc(0), 422, 'UPLOAD_REJECTED'],
    ];
    for (const [name, data, status, code] of cases) {
      const up = await upload(r.c, r.id, r.token, name, data, r.ip);
      expect({ name, status: up.status, code: up.json.code }).toEqual({ name, status, code });
    }
    expect(
      await h.db.select().from(schema.attachments).where(eq(schema.attachments.requestId, r.id)),
    ).toHaveLength(0);
  });

  it('accepts clean text, CSV and PDF files', async () => {
    const r = await created();
    expect(
      (await upload(r.c, r.id, r.token, 'notes.txt', Buffer.from('Hello, world\nLine two\n'), r.ip)).status,
    ).toBe(201);
    expect((await upload(r.c, r.id, r.token, 'data.csv', Buffer.from('a,b\n1,2\n'), r.ip)).status).toBe(201);
    expect((await upload(r.c, r.id, r.token, 'brief.pdf', PDF, r.ip)).status).toBe(201);
  });

  it('rejects files over the size limit', async () => {
    const r = await created();
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_FILE_BYTES, 0)]);
    expect((await upload(r.c, r.id, r.token, 'big.png', big, r.ip)).status).toBe(413);
  });

  it('allows at most 5 files per request', async () => {
    const r = await created();
    for (let i = 0; i < 5; i++)
      expect((await upload(r.c, r.id, r.token, `f${i}.png`, PNG, r.ip)).status).toBe(201);
    const sixth = await upload(r.c, r.id, r.token, 'f6.png', PNG, r.ip);
    expect(sixth.status).toBe(409);
    expect(sixth.json.code).toBe('TOO_MANY_FILES');
  });

  it('never trusts the supplied filename: path parts are stripped and the key stays random', async () => {
    const r = await created();
    expect((await upload(r.c, r.id, r.token, '../../etc/passwd.png', PNG, r.ip)).status).toBe(201);
    const [row] = await h.db.select().from(schema.attachments).where(eq(schema.attachments.requestId, r.id));
    expect(row?.originalName).toBe('passwd.png');
    expect(row?.storageKey).not.toContain('..');
  });

  it('fails honestly and leaves nothing behind when storage is down', async () => {
    const r = await created();
    const spy = vi.spyOn(h.storage, 'put').mockRejectedValue(new Error('blob down'));
    const up = await upload(r.c, r.id, r.token, 'a.png', PNG, r.ip);
    spy.mockRestore();
    expect(up.status).toBe(503);
    expect(up.json.code).toBe('UPLOADS_UNAVAILABLE');
    expect(
      await h.db.select().from(schema.attachments).where(eq(schema.attachments.requestId, r.id)),
    ).toHaveLength(0);
  });

  it('cannot upload to a deleted or unknown request', async () => {
    const r = await created();
    await h.db
      .update(schema.projectRequests)
      .set({ deletedAt: new Date() })
      .where(eq(schema.projectRequests.id, r.id));
    expect((await upload(r.c, r.id, r.token, 'a.png', PNG, r.ip)).status).toBe(404);
  });
});

describe('admin inbox: authorization', () => {
  it('anonymous callers get 401, clients get 403, and admins without TOTP get 403 on every inbox endpoint', async () => {
    const r = await created();
    const id = r.id;
    await upload(r.c, id, r.token, 'a.png', PNG, r.ip);
    const [att] = await h.db.select().from(schema.attachments).where(eq(schema.attachments.requestId, id));
    const calls: [string, 'get' | 'post', string][] = [
      ['get', 'get', '/admin/inquiries'],
      ['get', 'get', `/admin/inquiries/${id}`],
      ['get', 'get', `/admin/attachments/${att!.id}`],
    ];

    const anon = h.client(ip());
    await anon.primeCsrf();
    for (const [, , url] of calls) expect((await anon.get(url)).status, url).toBe(401);
    expect((await anon.req('POST', `/admin/inquiries/${id}`, {})).status).toBe(404); // no such route for POST

    await h.resetRateLimits();
    await h.createUser({ email: 'plain-client@example.com', password: PW, role: 'client' });
    const client = h.client(ip());
    await h.login(client, 'plain-client@example.com', PW);
    for (const [, , url] of calls) expect((await client.get(url)).status, url).toBe(403);
    expect((await client.req('PATCH' as 'POST', `/admin/inquiries/${id}`, { status: 'spam' })).status).toBe(
      403,
    );
    expect((await client.req('DELETE' as 'POST', `/admin/inquiries/${id}`, {})).status).toBe(403);

    await h.resetRateLimits();
    const noMfa = h.client(ip());
    await h.login(noMfa, adminEmail, PW);
    for (const [, , url] of calls) expect((await noMfa.get(url)).json.code, url).toBe('MFA_REQUIRED');
    expect((await noMfa.req('PATCH' as 'POST', `/admin/inquiries/${id}`, { status: 'spam' })).status).toBe(
      403,
    );
    const [still] = await h.db.select().from(schema.projectRequests).where(eq(schema.projectRequests.id, id));
    expect(still?.status).toBe('new');
  });
});

describe('admin inbox: operations', () => {
  it('lists, filters, searches, and paginates without duplicates or gaps', async () => {
    const a = await adminClient();
    for (let i = 0; i < 5; i++)
      await submit('/inquiries', body({ fullName: `Pager Person ${i}`, email: `pager${i}@example.com` }));
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const r: { json: { items: { id: string; contactName: string }[]; nextCursor: string | null } } =
        (await a.get(
          `/admin/inquiries?q=Pager%20Person&limit=2${cursor ? `&cursor=${cursor}` : ''}`,
        )) as never;
      seen.push(...r.json.items.map((i) => i.id));
      cursor = r.json.nextCursor;
      pages++;
    } while (cursor && pages < 10);
    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
    expect(pages).toBe(3);

    const all = await a.get('/admin/inquiries?limit=50');
    expect((all.json.counts as Record<string, number>).new).toBeGreaterThan(0);
    expect((await a.get('/admin/inquiries?status=spam')).json.items).toEqual([]);
    expect((await a.get('/admin/inquiries?status=bogus')).status).toBe(422);
    expect((await a.get('/admin/inquiries?cursor=not-valid')).status).toBe(422);
    // LIKE wildcards in the search box are literal characters, not "match everything"
    expect(((await a.get('/admin/inquiries?q=%25')).json.items as unknown[]).length).toBe(0);
    expect(
      ((await a.get('/admin/inquiries?kind=assessment')).json.items as { kind: string }[]).every(
        (i) => i.kind === 'assessment',
      ),
    ).toBe(true);
  });

  it('shows full detail without internal fingerprints, including the assessment and attachments', async () => {
    const a = await adminClient();
    const { res } = await submit('/assessments', assessment());
    const r = await a.get(`/admin/inquiries/${res.json.id}`);
    expect(r.status).toBe(200);
    expect(r.json.assessment).toMatchObject({ currentSystem: 'Grading portal', hasServerAccess: 'unsure' });
    const flat = JSON.stringify(r.json);
    expect(flat).not.toContain('ipHash');
    expect(flat).not.toContain('idempotencyKey');
    expect((await a.get('/admin/inquiries/00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await a.get('/admin/inquiries/not-a-uuid')).status).toBe(422);
  });

  it('updates status and notes with an audit trail, and validates input', async () => {
    const a = await adminClient();
    const { res } = await submit('/inquiries', body());
    const id = res.json.id as string;
    const patch = (b: unknown) => a.req('PATCH' as 'POST', `/admin/inquiries/${id}`, b);
    expect((await patch({ status: 'contacted', internalNotes: 'Called on Monday.' })).status).toBe(200);
    const [row] = await h.db.select().from(schema.projectRequests).where(eq(schema.projectRequests.id, id));
    expect(row).toMatchObject({ status: 'contacted', internalNotes: 'Called on Monday.' });
    const logs = await h.db.select().from(schema.activityLogs).where(eq(schema.activityLogs.entityId, id));
    const upd = logs.find((l) => l.action === 'admin.inquiry.updated');
    expect(upd?.before).toMatchObject({ status: 'new' });
    expect(upd?.after).toMatchObject({ status: 'contacted' });
    expect((await patch({ status: 'archived' })).status).toBe(422);
    expect((await patch({})).status).toBe(422);
    expect((await patch({ status: 'spam', evil: 1 })).status).toBe(422);
    expect(
      (await a.req('PATCH' as 'POST', `/admin/inquiries/${id}`, { status: 'spam' }, { csrf: null })).status,
    ).toBe(403);
  });

  it('soft-deletes: hidden from the list and detail, row kept, action audited', async () => {
    const a = await adminClient();
    const { res } = await submit('/inquiries', body({ fullName: 'Delete Me Please' }));
    const id = res.json.id as string;
    expect((await a.req('DELETE' as 'POST', `/admin/inquiries/${id}`, {})).status).toBe(200);
    expect((await a.get(`/admin/inquiries/${id}`)).status).toBe(404);
    expect(((await a.get('/admin/inquiries?q=Delete%20Me%20Please')).json.items as unknown[]).length).toBe(0);
    expect(
      await h.db.select().from(schema.projectRequests).where(eq(schema.projectRequests.id, id)),
    ).toHaveLength(1);
    expect((await a.req('DELETE' as 'POST', `/admin/inquiries/${id}`, {})).status).toBe(404);
    expect(
      (await h.db.select().from(schema.activityLogs).where(eq(schema.activityLogs.entityId, id))).some(
        (l) => l.action === 'admin.inquiry.deleted',
      ),
    ).toBe(true);
  });

  it('downloads attachments as non-renderable files with safe headers, and audits it', async () => {
    const a = await adminClient();
    const r = await created();
    await upload(r.c, r.id, r.token, 'plain.pdf', PDF, r.ip);
    // Store a hostile display name directly: quotes, accents, apostrophes and parentheses must not break the header.
    await h.db
      .update(schema.attachments)
      .set({ originalName: `résumé "final" o'neil (2).pdf` })
      .where(eq(schema.attachments.requestId, r.id));
    const [att] = await h.db.select().from(schema.attachments).where(eq(schema.attachments.requestId, r.id));
    const dl = await a.get(`/admin/attachments/${att!.id}`);
    expect(dl.status).toBe(200);
    expect(String(dl.headers['content-disposition'])).toBe(
      `attachment; filename="r_sum_ _final_ o'neil (2).pdf"; filename*=UTF-8''r%C3%A9sum%C3%A9%20%22final%22%20o%27neil%20%282%29.pdf`,
    );
    expect(dl.headers['x-content-type-options']).toBe('nosniff');
    expect(dl.headers['content-type']).toContain('application/pdf');
    expect(String(dl.headers['content-security-policy'])).toContain('sandbox');
    expect(dl.raw.rawPayload.equals(PDF)).toBe(true);
    expect(
      (await h.db.select().from(schema.activityLogs).where(eq(schema.activityLogs.entityId, att!.id))).some(
        (l) => l.action === 'admin.attachment.downloaded',
      ),
    ).toBe(true);

    await h.storage.delete(att!.storageKey);
    expect((await a.get(`/admin/attachments/${att!.id}`)).status).toBe(404);
    expect((await a.get('/admin/attachments/00000000-0000-4000-8000-000000000000')).status).toBe(404);
  });
});
