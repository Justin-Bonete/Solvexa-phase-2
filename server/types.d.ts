import 'fastify';
import type { LoadedSession } from './services/session.service';
import type { Ctx } from './services/auth.service';

declare module 'fastify' {
  interface FastifyRequest {
    auth: LoadedSession | null;
    sessionId: string | null;
    ctx: Ctx;
    ip_raw: string;
  }
}
