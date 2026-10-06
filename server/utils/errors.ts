import type { ZodTypeAny, z } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const Errors = {
  unauthenticated: () => new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.'),
  forbidden: (msg = 'You do not have permission to do that.') => new AppError(403, 'FORBIDDEN', msg),
  notFound: () => new AppError(404, 'NOT_FOUND', 'Not found.'),
  invalidCredentials: () => new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.'),
  rateLimited: (retryAfterSec: number) =>
    new AppError(429, 'RATE_LIMITED', 'Too many attempts. Try again later.', { retryAfterSec }),
  csrf: () => new AppError(403, 'CSRF_INVALID', 'Security token missing or invalid. Refresh and try again.'),
};

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data ?? {});
  if (r.success) return r.data;
  throw new AppError(422, 'VALIDATION_FAILED', 'Validation failed', {
    errors: r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}
