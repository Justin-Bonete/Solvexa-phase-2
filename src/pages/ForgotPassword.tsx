import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { forgotPasswordInput } from '@shared/schemas/auth';
import { AuthShell } from '@/features/auth/AuthShell';
import { applyApiError } from '@/features/auth/forms';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { FormField, Input } from '@/components/ui/Form';

type F = z.infer<typeof forgotPasswordInput>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<F>({ resolver: zodResolver(forgotPasswordInput) });
  const submit = handleSubmit(async (v) => {
    setErr(null);
    try {
      await api.post('/auth/forgot-password', v);
      setSent(true);
    } catch (e) {
      setErr(applyApiError(e, setError));
    }
  });
  return (
    <AuthShell
      title="Reset your password"
      intro="Enter your email and I will send a link that works for 60 minutes."
      footer={
        <Link className="text-accent hover:underline" to="/login">
          Back to sign in
        </Link>
      }
    >
      {sent && (
        <Alert tone="success" title="Request received">
          If an account exists for that email, a reset link has been sent.
        </Alert>
      )}
      {err && <Alert tone="danger">{err}</Alert>}
      <form onSubmit={submit} noValidate className="space-y-5">
        <FormField label="Email" error={errors.email?.message} required>
          {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
        </FormField>
        <Button type="submit" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
