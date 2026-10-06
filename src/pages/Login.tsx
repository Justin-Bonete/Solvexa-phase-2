import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, setCsrfToken } from '@/lib/api';
import { loginInput, type LoginInput, type SessionUser } from '@shared/schemas/auth';
import { AuthShell } from '@/features/auth/AuthShell';
import { applyApiError } from '@/features/auth/forms';
import { homeFor, meKey, safeReturnTo } from '@/features/auth/useAuth';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { FormField, Input } from '@/components/ui/Form';

export default function Login() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInput) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setNeedsVerify(false);
    try {
      const r = await api.post<{ csrfToken: string }>('/auth/login', values);
      setCsrfToken(r.csrfToken);
      const me = await api.get<{ user: SessionUser }>('/auth/me');
      qc.setQueryData(meKey, me.user);
      const returnTo = safeReturnTo(params.get('returnTo'));
      nav(me.user.role === 'admin' ? homeFor(me.user) : (returnTo ?? homeFor(me.user)), { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') setNeedsVerify(true);
      setFormError(applyApiError(e, setError));
    }
  });

  return (
    <AuthShell
      title="Sign in"
      intro="Access your projects, requests, and conversations."
      footer={
        <>
          New here?{' '}
          <Link className="text-accent underline-offset-4 hover:underline" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      {formError && (
        <Alert tone="danger" title="Could not sign in">
          {formError}
          {needsVerify && (
            <>
              {' '}
              <Link className="underline" to="/verify-email">
                Request a new verification link.
              </Link>
            </>
          )}
        </Alert>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField label="Email" error={errors.email?.message} required>
          {(a) => <Input {...a} type="email" autoComplete="email" inputMode="email" {...register('email')} />}
        </FormField>
        <FormField label="Password" error={errors.password?.message} required>
          {(a) => <Input {...a} type="password" autoComplete="current-password" {...register('password')} />}
        </FormField>
        <div className="flex items-center justify-between gap-4">
          <Button type="submit" loading={isSubmitting}>
            Sign in
          </Button>
          <Link
            className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
            to="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
