import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  APP_URL: z.string().url().default('http://localhost:5173'),
  /** HMAC key for CSRF + IP hashing. Min 32 chars. */
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  /** Base64 of 32 random bytes. Encrypts TOTP secrets at rest. */
  TOTP_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be base64 of 32 bytes'),
  MAIL_TRANSPORT: z.enum(['console', 'resend']).default('console'),
  MAIL_FROM: z.string().default('Solvexa <noreply@example.com>'),
  RESEND_API_KEY: z.string().optional(),
  TURNSTILE_SECRET: z.string().optional(),
  REQUIRE_TURNSTILE: bool,
  /** local = dev disk. blob = private Vercel Blob store (required in production; serverless disks are ephemeral). */
  STORAGE_DRIVER: z.enum(['local', 'blob', 'none']).default('local'),
  /** TESTING ONLY. Lets a deployed (production-mode) preview use console email. Never set this for real clients. */
  ALLOW_DEV_SERVICES: bool,
  STORAGE_DIR: z.string().default('.data/uploads'),
  PORT: z.coerce.number().default(3001),
});

export type Env = z.infer<typeof schema> & { isProd: boolean; isTest: boolean };

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${msg}`);
  }
  const e = parsed.data;
  const isProd = e.NODE_ENV === 'production';
  if (isProd && e.MAIL_TRANSPORT === 'console' && !e.ALLOW_DEV_SERVICES) {
    throw new Error(
      'MAIL_TRANSPORT=console is dev-only and refused in production. Use resend (or set ALLOW_DEV_SERVICES=true for a testing-only deploy).',
    );
  }
  if (isProd && e.STORAGE_DRIVER === 'local') {
    throw new Error(
      'STORAGE_DRIVER=local is dev-only and refused in production. Use blob (a private Vercel Blob store).',
    );
  }
  if (e.MAIL_TRANSPORT === 'resend' && !e.RESEND_API_KEY)
    throw new Error('RESEND_API_KEY is required for MAIL_TRANSPORT=resend');
  if (isProd && !e.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
  return { ...e, isProd, isTest: e.NODE_ENV === 'test' };
}
