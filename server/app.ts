import Fastify, { type FastifyError } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { MAX_FILE_BYTES } from '../shared/uploads';
import { ZodError } from 'zod';
import { registerSecurity, type Deps } from './middleware/security';
import { registerRoutes } from './routes';
import { AppError } from './utils/errors';

export async function buildApp(deps: Deps) {
  const app = Fastify({
    trustProxy: true, // Vercel sits behind a proxy; req.ip comes from x-forwarded-for
    bodyLimit: 64 * 1024,
    logger: deps.env.isTest
      ? false
      : {
          level: 'info',
          redact: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-csrf-token"]'],
        },
  });

  await app.register(cookie);
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  });
  await app.register(multipart, { limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 4, parts: 6 } });
  registerSecurity(app, deps);

  app.setErrorHandler((err: FastifyError | AppError | ZodError, req, reply) => {
    const requestId = req.ctx?.requestId;
    const problem = (status: number, code: string, title: string, extra: Record<string, unknown> = {}) =>
      reply
        .code(status)
        .type('application/problem+json')
        .send({ type: code.toLowerCase(), status, title, code, requestId, ...extra });

    if (err instanceof AppError) {
      if (err.status === 429) reply.header('Retry-After', String(err.extra.retryAfterSec ?? 60));
      return problem(err.status, err.code, err.message, err.extra);
    }
    const status = 'statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : 500;
    if (status === 413) return problem(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
    if (status === 415) return problem(415, 'UNSUPPORTED_MEDIA', 'Unsupported content type.');
    if (status >= 400 && status < 500)
      return problem(status, 'BAD_REQUEST', 'The request could not be processed.');
    req.log.error({ err: { name: err.name, message: err.message }, requestId }, 'unhandled error'); // no bodies, no SQL params
    return problem(500, 'INTERNAL', 'Something went wrong on the server.');
  });
  app.setNotFoundHandler((req, reply) =>
    reply.code(404).type('application/problem+json').send({
      type: 'not_found',
      status: 404,
      title: 'Not found.',
      code: 'NOT_FOUND',
      requestId: req.ctx?.requestId,
    }),
  );

  await registerRoutes(app);
  return app;
}
