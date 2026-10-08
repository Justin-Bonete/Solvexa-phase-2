import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from '../server/app';
import { loadEnv } from '../server/env';
import { createDb } from '../server/database/client';
import { createMailer } from '../server/adapters/mailer';
import { createStorage } from '../server/adapters/storage';

/** Vercel serverless entry. The Fastify instance is built once per warm container. */
let ready: ReturnType<typeof boot> | undefined;
async function boot() {
  const env = loadEnv();
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const app = await buildApp({
    db: createDb(env.DATABASE_URL),
    env,
    mailer: createMailer(env),
    storage: createStorage(env),
  });
  await app.ready();
  return app;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  ready ??= boot();
  const app = await ready;
  app.server.emit('request', req, res);
}
