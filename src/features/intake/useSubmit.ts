import { useCallback, useRef, useState } from 'react';
import type { FieldValues, UseFormSetError } from 'react-hook-form';
import { api, ApiError } from '@/lib/api';
import { applyApiError } from '@/features/auth/forms';
import type { Created } from './Confirmation';

const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k${Date.now()}${Math.random().toString(36).slice(2)}`;

/** Drops empty values so the request carries only what the visitor actually filled in. */
export function compact(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === '' || v === undefined || v === null || (typeof v === 'number' && Number.isNaN(v))) continue;
    out[k] = v;
  }
  return out;
}

/**
 * One idempotency key per attempt-set: a retry after a network error reuses it, so the request can never be saved twice.
 * Returns `created` only when the server answered with a reference.
 */
export function useSubmit<T extends FieldValues>(
  endpoint: '/inquiries' | '/assessments',
  setError: UseFormSetError<T>,
) {
  const key = useRef(newKey());
  const startedAt = useRef(Date.now());
  const [turnstileToken, setToken] = useState<string | undefined>();
  const [created, setCreated] = useState<Created | null>(null);
  const [error, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (payload: Record<string, unknown>) => {
      setSubmitting(true);
      setFormError(null);
      try {
        const res = await api.post<Partial<Created>>(
          endpoint,
          {
            ...compact(payload),
            startedAt: startedAt.current,
            ...(turnstileToken ? { turnstileToken } : {}),
          },
          { headers: { 'Idempotency-Key': key.current } },
        );
        if (!res.reference || !res.id || !res.uploadToken) {
          // Never show a confirmation the server did not give us.
          setFormError(
            'I could not confirm that your request was saved. Please try again, or contact me directly.',
          );
          return null;
        }
        setCreated(res as Created);
        return res as Created;
      } catch (e) {
        if (e instanceof ApiError && e.status === 422 && e.code === 'BOT_CHECK_FAILED')
          setFormError(e.message);
        else setFormError(applyApiError(e, setError));
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [endpoint, setError, turnstileToken],
  );

  const reset = useCallback(() => {
    key.current = newKey();
    startedAt.current = Date.now();
    setCreated(null);
    setFormError(null);
  }, []);

  return { submit, submitting, created, error, setToken, reset };
}
