import type { Env } from '../env';
import { AppError } from '../utils/errors';

/** Cloudflare Turnstile server-side check. Skipped entirely unless REQUIRE_TURNSTILE=true. */
export async function verifyTurnstile(env: Env, token: string | undefined, ip: string): Promise<void> {
  if (!env.REQUIRE_TURNSTILE) return;
  if (!env.TURNSTILE_SECRET) throw new AppError(503, 'BOT_CHECK_UNAVAILABLE', 'Bot check is not configured.');
  if (!token) throw new AppError(422, 'BOT_CHECK_FAILED', 'Complete the bot check and try again.');
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
  });
  const body = (await res.json()) as { success?: boolean };
  if (!body.success) throw new AppError(422, 'BOT_CHECK_FAILED', 'Bot check failed. Try again.');
}
