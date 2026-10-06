import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api } from '@/lib/api';
import { password } from '@shared/schemas/auth';
import { AuthShell } from '@/features/auth/AuthShell';
import { applyApiError } from '@/features/auth/forms';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { FormField, Input } from '@/components/ui/Form';

const schema = z.object({ password }).strict();
type F = z.infer<typeof schema>;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<F>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async (v) => {
    setErr(null);
    try {
      await api.post('/auth/reset-password', { token, password: v.password });
      setDone(true);
    } catch (e) {
      setErr(applyApiError(e, setError));
    }
  });
  if (done)
    return (
      <AuthShell title="Password updated">
        <Alert tone="success" title="All other sessions were signed out">
          Sign in with your new password.
        </Alert>
        <Link className="text-accent hover:underline" to="/login">
          Go to sign in
        </Link>
      </AuthShell>
    );
  if (!token)
    return (
      <AuthShell title="This link is incomplete">
        <Alert tone="warning">
          Open the full link from your email, or{' '}
          <Link className="underline" to="/forgot-password">
            request a new one
          </Link>
          .
        </Alert>
      </AuthShell>
    );
  return (
    <AuthShell title="Choose a new password">
      {err && (
        <Alert tone="danger">
          {err}{' '}
          <Link className="underline" to="/forgot-password">
            Request a new link
          </Link>
          .
        </Alert>
      )}
      <form onSubmit={submit} noValidate className="space-y-5">
        <FormField
          label="New password"
          hint="At least 12 characters."
          error={errors.password?.message}
          required
        >
          {(a) => <Input {...a} type="password" autoComplete="new-password" {...register('password')} />}
        </FormField>
        <Button type="submit" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
