import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { requireDatabaseUrl } from '../../server/database/client';
import { loadEnv } from '../../server/env';

const script = resolve('scripts/setup-env.mjs');
const run = (dir: string) => execFileSync('node', [script], { cwd: dir, encoding: 'utf8' });
const read = (dir: string) =>
  Object.fromEntries(
    readFileSync(join(dir, '.env'), 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  );

describe('npm run setup', () => {
  it('creates .env with secrets that pass the real env validation, and is idempotent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'solvexa-'));
    copyFileSync('.env.example', join(dir, '.env.example'));
    const out = run(dir);
    expect(out).toContain('Created .env');
    const a = read(dir);
    expect(() =>
      loadEnv({
        NODE_ENV: 'development',
        SESSION_SECRET: a.SESSION_SECRET,
        TOTP_ENCRYPTION_KEY: a.TOTP_ENCRYPTION_KEY,
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
    expect(out).not.toContain(a.SESSION_SECRET as string); // never prints secrets
    run(dir);
    const b = read(dir);
    expect(b.SESSION_SECRET).toBe(a.SESSION_SECRET);
    expect(b.TOTP_ENCRYPTION_KEY).toBe(a.TOTP_ENCRYPTION_KEY);
    expect(b.ADMIN_EMAIL).toBe(a.ADMIN_EMAIL);
  });

  it('repairs invalid values (too short, wrong length, quoted) and keeps CRLF line endings', () => {
    const dir = mkdtempSync(join(tmpdir(), 'solvexa-'));
    writeFileSync(
      join(dir, '.env'),
      'DATABASE_URL=postgresql://real\r\nSESSION_SECRET=short\r\nTOTP_ENCRYPTION_KEY="not-32-bytes"\r\n',
    );
    copyFileSync('.env.example', join(dir, '.env.example'));
    const out = run(dir);
    expect(out).toContain('SESSION_SECRET: was invalid, replaced');
    expect(out).toContain('TOTP_ENCRYPTION_KEY: was invalid, replaced');
    const raw = readFileSync(join(dir, '.env'), 'utf8');
    expect(raw).toContain('\r\n');
    const v = read(dir);
    expect(v.DATABASE_URL).toBe('postgresql://real');
    expect(() =>
      loadEnv({
        NODE_ENV: 'development',
        SESSION_SECRET: v.SESSION_SECRET,
        TOTP_ENCRYPTION_KEY: v.TOTP_ENCRYPTION_KEY,
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });
});

describe('requireDatabaseUrl', () => {
  it('explains missing and placeholder values in plain language', () => {
    expect(() => requireDatabaseUrl(undefined)).toThrow(/not set/);
    expect(() => requireDatabaseUrl('postgres://user:password@localhost:5432/solvexa')).toThrow(
      /example value/,
    );
    expect(
      requireDatabaseUrl('postgresql://neonuser:s3cret@ep-x-pooler.aws.neon.tech/neondb?sslmode=require'),
    ).toContain('neon.tech');
  });
});
