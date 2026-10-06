import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/lib/api';

/** Maps server validation errors onto form fields; returns a message for anything else. */
export function applyApiError<T extends FieldValues>(
  e: unknown,
  setError: UseFormSetError<T>,
): string | null {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  if (e.status === 422 && e.errors.length) {
    let unmapped = false;
    for (const f of e.errors) {
      if (f.path) setError(f.path as Path<T>, { type: 'server', message: f.message });
      else unmapped = true;
    }
    return unmapped ? e.message : null;
  }
  if (e.status === 429)
    return `Too many attempts. Try again in ${Math.max(1, Math.ceil((e.retryAfterSec ?? 60) / 60))} minute(s).`;
  if (e.code === 'NETWORK') return e.message;
  return e.message;
}
