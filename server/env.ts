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
  if (isProd && e.MAIL_TRANSPORT === 'console') {
    throw new Error('MAIL_TRANSPORT=console is dev-only and refused in production. Use resend.');
  }
  if (e.MAIL_TRANSPORT === 'resend' && !e.RESEND_API_KEY)
    throw new Error('RESEND_API_KEY is required for MAIL_TRANSPORT=resend');
  if (isProd && !e.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
  return { ...e, isProd, isTest: e.NODE_ENV === 'test' };
}
