// Creates .env from .env.example if missing and fills in valid SESSION_SECRET / TOTP_ENCRYPTION_KEY.
// Never overwrites values that are already valid. Never prints secrets.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const target = '.env';
if (!existsSync(target)) {
  if (!existsSync('.env.example'))
    throw new Error('.env.example not found. Run this from the project folder.');
  writeFileSync(target, readFileSync('.env.example', 'utf8'));
  console.log('Created .env from .env.example');
}

let text = readFileSync(target, 'utf8').replace(/^\uFEFF/, '');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);

const validators = {
  SESSION_SECRET: (v) => v.length >= 32,
  TOTP_ENCRYPTION_KEY: (v) => /^[A-Za-z0-9+/]+={0,2}$/.test(v) && Buffer.from(v, 'base64').length === 32,
};
const generators = {
  SESSION_SECRET: () => randomBytes(48).toString('base64url'),
  TOTP_ENCRYPTION_KEY: () => randomBytes(32).toString('base64'),
};

const report = [];
for (const key of Object.keys(validators)) {
  const i = lines.findIndex((l) => l.startsWith(`${key}=`));
  const current =
    i >= 0
      ? lines[i]
          .slice(key.length + 1)
          .trim()
          .replace(/^["']|["']$/g, '')
      : '';
  if (current && validators[key](current)) {
    report.push(`${key}: already valid, left unchanged`);
    continue;
  }
  const line = `${key}=${generators[key]()}`;
  if (i >= 0) lines[i] = line;
  else lines.push(line);
  report.push(`${key}: ${current ? 'was invalid, replaced' : 'generated'}`);
}
writeFileSync(target, lines.join(eol));
console.log(report.join('\n'));

const db = (lines.find((l) => l.startsWith('DATABASE_URL=')) ?? '').slice(13).trim();
if (!db || /user:password@/.test(db)) {
  console.log(
    '\nNEXT: DATABASE_URL in .env is still the example value. Replace it with your Neon pooled connection string.',
  );
} else {
  console.log('\nDATABASE_URL looks set. Next: npm run db:migrate');
}
