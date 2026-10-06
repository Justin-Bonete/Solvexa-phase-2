import { sql } from 'drizzle-orm';
import type { Db } from '../database/client';
import { schema } from '../database/client';

export type RateResult = { allowed: boolean; remaining: number; retryAfterSec: number };

/** Fixed-window counter in Postgres (shared across serverless instances). */
export async function hit(db: Db, key: string, limit: number, windowSec: number): Promise<RateResult> {
  const now = Date.now();
  const start = new Date(Math.floor(now / (windowSec * 1000)) * windowSec * 1000);
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key, windowStart: start, count: 1 })
    .onConflictDoUpdate({
      target: [schema.rateLimits.key, schema.rateLimits.windowStart],
      set: { count: sql`${schema.rateLimits.count} + 1` },
    })
    .returning({ count: schema.rateLimits.count });
  const count = row?.count ?? 1;
  const retryAfterSec = Math.max(1, Math.ceil((start.getTime() + windowSec * 1000 - now) / 1000));
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSec };
}

/** Housekeeping: call opportunistically or from a daily cron. */
export async function purgeOldWindows(db: Db): Promise<void> {
  await db.delete(schema.rateLimits).where(sql`${schema.rateLimits.windowStart} < now() - interval '2 days'`);
}
