import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { registerInput, type RegisterInput } from '@shared/schemas/auth';
import { AuthShell } from '@/features/auth/AuthShell';
import { applyApiError } from '@/features/auth/forms';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { Checkbox, FormField, Input } from '@/components/ui/Form';
import { Turnstile } from '@/components/ui/Turnstile';

export default function Register() {
  const [done, setDone] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [botToken, setBotToken] = useState<string | undefined>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerInput), defaultValues: { website: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const r = await api.post<{ message: string }>('/auth/register', {
        ...values,
        ...(botToken ? { turnstileToken: botToken } : {}),
      });
      setDone(values.email); // shown only after the server accepted the request
      void r;
    } catch (e) {
      setFormError(applyApiError(e, setError));
    }
  });

  if (done) {
    return (
      <AuthShell title="Check your email">
        <Alert tone="success" title="Almost done">
          I sent a verification link to <strong>{done}</strong>. It expires in 24 hours. You can sign in once
          you have confirmed your email.
        </Alert>
        <p className="text-sm text-muted">
          Nothing arrived? Check spam, then{' '}
          <Link className="text-accent hover:underline" to="/verify-email">
            request a new link
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      intro="One account for your requests, messages, support tickets, and project updates."
      footer={
        <>
          Already have an account?{' '}
          <Link className="text-accent underline-offset-4 hover:underline" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      {formError && (
        <Alert tone="danger" title="Could not create the account">
          {formError}
        </Alert>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField label="Full name" error={errors.fullName?.message} required>
          {(a) => <Input {...a} autoComplete="name" {...register('fullName')} />}
        </FormField>
        <FormField label="Email" error={errors.email?.message} required>
          {(a) => <Input {...a} type="email" autoComplete="email" inputMode="email" {...register('email')} />}
        </FormField>
        <FormField label="Organization" hint="Optional" error={errors.organization?.message}>
          {(a) => <Input {...a} autoComplete="organization" {...register('organization')} />}
        </FormField>
        <FormField
          label="Password"
          hint="At least 12 characters. A few random words works well."
          error={errors.password?.message}
          required
        >
          {(a) => <Input {...a} type="password" autoComplete="new-password" {...register('password')} />}
        </FormField>
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Leave this empty
            <input tabIndex={-1} autoComplete="off" {...register('website')} />
          </label>
        </div>
        <Checkbox
          label={
            <>
              I have read how my information is handled. My details are used only to run my account and
              respond to my requests.
            </>
          }
          error={errors.consent?.message}
          {...register('consent')}
        />
        <Turnstile onToken={setBotToken} />
        <Button type="submit" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
