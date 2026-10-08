import { mkdtempSync, readdirSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LocalStorage,
  MemoryStorage,
  NoStorage,
  assertSafeKey,
  createStorage,
  newStorageKey,
} from '../../server/adapters/storage';
import { loadEnv } from '../../server/env';
import { sanitizeFilename } from '../../server/services/upload.service';
import { TEST_ENV } from './helpers';

const fresh = () => new LocalStorage(mkdtempSync(join(tmpdir(), 'solvexa-store-')));

describe('LocalStorage (the dev driver)', () => {
  it('stores, reads back, and deletes a file; missing files read as null', async () => {
    const s = fresh();
    const key = newStorageKey('requests/abc');
    await s.put(key, Buffer.from('hello'), 'text/plain');
    expect((await s.get(key))?.toString()).toBe('hello');
    await s.delete(key);
    expect(await s.get(key)).toBeNull();
    await s.delete(key); // deleting twice is harmless
  });

  it('refuses to overwrite an existing file', async () => {
    const s = fresh();
    await s.put('requests/a/one', Buffer.from('1'), 'text/plain');
    await expect(s.put('requests/a/one', Buffer.from('2'), 'text/plain')).rejects.toThrow();
    expect((await s.get('requests/a/one'))?.toString()).toBe('1');
  });

  it('rejects keys that could escape the storage directory', async () => {
    const s = fresh();
    for (const bad of [
      '../evil',
      'a/../../evil',
      '/etc/passwd',
      'a//b',
      'a\\b',
      '',
      '.hidden',
      'a b',
      'x'.repeat(300),
    ]) {
      await expect(s.put(bad, Buffer.from('x'), 'text/plain'), bad).rejects.toThrow();
      await expect(s.get(bad), bad).rejects.toThrow();
    }
    expect(() => assertSafeKey('requests/ok/abc123')).not.toThrow();
  });

  it('writes owner-only files, inside its own directory only', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'solvexa-store-'));
    const s = new LocalStorage(dir);
    await s.put('requests/r1/file', Buffer.from('x'), 'text/plain');
    const p = join(dir, 'requests', 'r1', 'file');
    expect(existsSync(p)).toBe(true);
    if (process.platform !== 'win32') expect(statSync(p).mode & 0o777).toBe(0o600);
    expect(readdirSync(dir)).toEqual(['requests']);
  });

  it('generates unguessable, unique keys', () => {
    const keys = new Set(Array.from({ length: 200 }, () => newStorageKey('requests/x')));
    expect(keys.size).toBe(200);
    for (const k of keys) expect(k).toMatch(/^requests\/x\/[0-9a-f]{32}$/);
  });

  it('is never inside the web root (dist/ or public/)', () => {
    const dir = resolve(loadEnv({ ...TEST_ENV }).STORAGE_DIR);
    expect(dir).not.toContain(`${resolve('dist')}`);
    expect(dir).not.toContain(`${resolve('public')}`);
  });
});

describe('MemoryStorage (test double) mirrors the safety rules', () => {
  it('refuses overwrites and unsafe keys', async () => {
    const s = new MemoryStorage();
    await s.put('requests/a/one', Buffer.from('1'), 'text/plain');
    await expect(s.put('requests/a/one', Buffer.from('2'), 'text/plain')).rejects.toThrow();
    await expect(s.put('../x', Buffer.from('2'), 'text/plain')).rejects.toThrow();
  });
});

describe('production configuration', () => {
  const prod = {
    ...TEST_ENV,
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://x',
    MAIL_TRANSPORT: 'resend',
    RESEND_API_KEY: 're_x',
  } as unknown as NodeJS.ProcessEnv;
  it('refuses local disk storage in production and accepts a private blob store', () => {
    expect(() => loadEnv({ ...prod, STORAGE_DRIVER: 'local' })).toThrow(/dev-only/);
    expect(() => loadEnv(prod)).toThrow(/dev-only/); // the default is local, so it must be chosen explicitly
    expect(loadEnv({ ...prod, STORAGE_DRIVER: 'blob' }).STORAGE_DRIVER).toBe('blob');
  });
});

describe('testing-only deploy mode', () => {
  const prod = {
    ...TEST_ENV,
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://x',
    STORAGE_DRIVER: 'none',
  } as unknown as NodeJS.ProcessEnv;
  it('is off by default: production still refuses console email', () => {
    expect(() => loadEnv(prod)).toThrow(/dev-only/);
  });
  it('allows console email in production only with the explicit flag', () => {
    expect(loadEnv({ ...prod, ALLOW_DEV_SERVICES: 'true' }).MAIL_TRANSPORT).toBe('console');
    expect(() => loadEnv({ ...prod, ALLOW_DEV_SERVICES: 'false' })).toThrow(/dev-only/);
  });
  it('never allows local disk storage in production, even with the flag', () => {
    expect(() => loadEnv({ ...prod, ALLOW_DEV_SERVICES: 'true', STORAGE_DRIVER: 'local' })).toThrow(
      /dev-only/,
    );
  });
  it('"none" storage fails honestly instead of pretending to store', async () => {
    const s = createStorage(loadEnv({ ...prod, ALLOW_DEV_SERVICES: 'true' }));
    expect(s).toBeInstanceOf(NoStorage);
    await expect(s.put('requests/a/b', Buffer.from('x'), 'text/plain')).rejects.toThrow();
    expect(await s.get('requests/a/b')).toBeNull();
  });
});

describe('sanitizeFilename', () => {
  it('strips paths, control and bidi characters, and bounds the length', () => {
    expect(sanitizeFilename('../../etc/passwd.png')).toBe('passwd.png');
    expect(sanitizeFilename('C:\\Users\\x\\report.pdf')).toBe('report.pdf');
    expect(sanitizeFilename('inv\u202Eoice.pdf')).toBe('invoice.pdf'); // right-to-left override removed
    expect(sanitizeFilename('a\u0000b\u0007.txt')).toBe('ab.txt');
    expect(sanitizeFilename('x'.repeat(500) + '.png').length).toBeLessThanOrEqual(120);
    expect(sanitizeFilename('   ')).toBe('file');
  });
});
