import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthShell } from '@/features/auth/AuthShell';
import { applyApiError } from '@/features/auth/forms';
import { meKey, useAuth } from '@/features/auth/useAuth';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert, Skeleton } from '@/components/ui/Feedback';
import { FormField, Input } from '@/components/ui/Form';
import { Navigate } from 'react-router-dom';

type Enroll = { qrSvg: string; manualKey: string };

export default function Mfa() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading)
    return (
      <AuthShell title="Two-factor verification">
        <Skeleton className="h-24 w-full" />
      </AuthShell>
    );
  if (!user) return <Navigate to="/login?returnTo=/mfa" replace />;
  if (user.role !== 'admin') return <Navigate to="/portal" replace />;
  if (user.mfa === 'verified' && !codes) return <Navigate to="/admin" replace />;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(applyApiError(e, () => undefined));
    } finally {
      setBusy(false);
    }
  };
  const refreshMe = () => qc.invalidateQueries({ queryKey: meKey });

  if (codes) {
    return (
      <AuthShell title="Save your recovery codes">
        <Alert tone="warning" title="Shown once">
          Each code works one time if you lose your authenticator. Store them somewhere safe and private.
        </Alert>
        <ul className="grid grid-cols-2 gap-2 rounded-md border border-line bg-s1 p-4 font-mono text-sm">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <Button
          onClick={async () => {
            await refreshMe();
            nav('/admin', { replace: true });
          }}
        >
          I have saved them
        </Button>
      </AuthShell>
    );
  }

  if (user.mfa === 'enrollment_required') {
    return (
      <AuthShell
        title="Set up two-factor authentication"
        intro="Administrator accounts require an authenticator app (TOTP)."
      >
        {err && <Alert tone="danger">{err}</Alert>}
        {!enroll ? (
          <Button
            loading={busy}
            onClick={() => run(async () => setEnroll(await api.post<Enroll>('/auth/mfa/enroll')))}
          >
            Start setup
          </Button>
        ) : (
          <div className="space-y-5">
            <img
              alt="QR code for your authenticator app"
              width={200}
              height={200}
              className="rounded-md bg-white p-2"
              src={`data:image/svg+xml;utf8,${encodeURIComponent(enroll.qrSvg)}`}
            />
            <p className="text-sm text-muted">
              Cannot scan? Enter this key manually:{' '}
              <code className="font-mono text-fg">{enroll.manualKey}</code>
            </p>
            <FormField label="6-digit code" required>
              {(a) => (
                <Input
                  {...a}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              )}
            </FormField>
            <Button
              loading={busy}
              onClick={() =>
                run(async () => {
                  const r = await api.post<{ recoveryCodes: string[] }>('/auth/mfa/enroll/confirm', { code });
                  setCodes(r.recoveryCodes);
                })
              }
            >
              Confirm and finish
            </Button>
          </div>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Two-factor verification"
      intro="Enter the code from your authenticator app, or a recovery code."
    >
      {err && <Alert tone="danger">{err}</Alert>}
      <FormField label="Code" required>
        {(a) => (
          <Input {...a} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
        )}
      </FormField>
      <div className="flex gap-3">
        <Button
          loading={busy}
          onClick={() =>
            run(async () => {
              await api.post('/auth/mfa/verify', { code });
              await refreshMe();
              nav('/admin', { replace: true });
            })
          }
        >
          Verify
        </Button>
        <ButtonLink to="/" variant="tertiary">
          Cancel
        </ButtonLink>
      </div>
    </AuthShell>
  );
}
