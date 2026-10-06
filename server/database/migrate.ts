import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb, requireDatabaseUrl } from './client';

const url = requireDatabaseUrl();
await migrate(createDb(url), { migrationsFolder: fileURLToPath(new URL('./migrations', import.meta.url)) });
console.log('Migrations applied.');
process.exit(0);
