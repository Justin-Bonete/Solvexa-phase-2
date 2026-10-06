import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { resendVerificationInput } from '@shared/schemas/auth';
import { AuthShell } from '@/features/auth/AuthShell';
import { applyApiError } from '@/features/auth/forms';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { FormField, Input } from '@/components/ui/Form';
import type { z } from 'zod';

type ResendForm = z.infer<typeof resendVerificationInput>;

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResendForm>({ resolver: zodResolver(resendVerificationInput) });

  async function verify() {
    setState('working');
    try {
      await api.post('/auth/verify-email', { token });
      setState('done');
    } catch (e) {
      setMessage(applyApiError(e, () => undefined));
      setState('failed');
    }
  }
  const resend = handleSubmit(async (v) => {
    try {
      await api.post('/auth/resend-verification', v);
      setResent(true);
      setMessage(null);
    } catch (e) {
      setMessage(applyApiError(e, setError));
    }
  });

  if (state === 'done') {
    return (
      <AuthShell title="Email verified">
        <Alert tone="success" title="Your account is active">
          You can sign in now.
        </Alert>
        <Link className="inline-block text-accent hover:underline" to="/login">
          Go to sign in
        </Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Verify your email">
      {token ? (
        <>
          <p className="text-muted">Confirm that this is your email address to activate your account.</p>
          {state === 'failed' && (
            <Alert tone="danger" title="Could not verify">
              {message} Request a new link below.
            </Alert>
          )}
          <Button onClick={verify} loading={state === 'working'}>
            Verify my email
          </Button>
        </>
      ) : (
        <p className="text-muted">Open the link in your verification email, or request a new one.</p>
      )}
      <form onSubmit={resend} noValidate className="space-y-4 border-t border-line pt-6">
        <h2 className="text-lg font-semibold">Request a new link</h2>
        {resent && (
          <Alert tone="success">If that account needs verification, a new link has been sent.</Alert>
        )}
        {message && state !== 'failed' && <Alert tone="danger">{message}</Alert>}
        <FormField label="Email" error={errors.email?.message} required>
          {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
        </FormField>
        <Button type="submit" variant="secondary" loading={isSubmitting}>
          Send new link
        </Button>
      </form>
    </AuthShell>
  );
}
