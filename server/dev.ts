import { buildApp } from './app';
import { loadEnv } from './env';
import { createDb, requireDatabaseUrl } from './database/client';
import { createMailer } from './adapters/mailer';
import { createStorage } from './adapters/storage';

const env = loadEnv();
const app = await buildApp({
  db: createDb(requireDatabaseUrl(env.DATABASE_URL)),
  env,
  mailer: createMailer(env),
  storage: createStorage(env),
});
await app.listen({ port: env.PORT, host: '127.0.0.1' });
