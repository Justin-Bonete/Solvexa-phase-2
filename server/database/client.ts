import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../models/schema';

export type Db = NodePgDatabase<typeof schema>;
export { schema };

let pool: pg.Pool | undefined;

/** Serverless-friendly: tiny pool, reused across warm invocations. Works with any Postgres (Neon pooled URL, local, etc.). */
export function createDb(databaseUrl: string): Db {
  pool ??= new pg.Pool({
    connectionString: databaseUrl,
    max: 3,
    idleTimeoutMillis: 10_000,
    ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? undefined : { rejectUnauthorized: true },
  });
  return drizzle(pool, { schema });
}

const PLACEHOLDER = /user:password@|your[-_]?password|<password>|\[password\]/i;

/** Fails early, in plain language, when DATABASE_URL is missing or is still the example value. */
export function requireDatabaseUrl(url = process.env.DATABASE_URL): string {
  if (!url)
    throw new Error(
      'DATABASE_URL is not set. Add it to your .env file (the pooled connection string from Neon).',
    );
  if (PLACEHOLDER.test(url)) {
    throw new Error(
      'DATABASE_URL still contains the example value (user:password). Replace it in .env with your real connection string from Neon.',
    );
  }
  return url;
}
