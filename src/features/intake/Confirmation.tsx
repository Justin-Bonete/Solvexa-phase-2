import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { Alert } from '@/components/ui/Feedback';
import { Button, buttonClass } from '@/components/ui/Button';

export type Created = {
  id: string;
  reference: string;
  uploadToken: string;
  emailStatus: 'sent' | 'failed' | 'budget_exhausted';
};
type FileState = { file: File; status: 'waiting' | 'uploading' | 'done' | 'failed'; message?: string };

/**
 * Shown ONLY after the server has saved the request and returned a reference.
 * Files are uploaded one at a time afterwards; each shows its true state and can be retried.
 */
export function Confirmation({
  created,
  email,
  files,
  onReset,
}: {
  created: Created;
  email: string;
  files: File[];
  onReset?: () => void;
}) {
  const [items, setItems] = useState<FileState[]>(() => files.map((file) => ({ file, status: 'waiting' })));
  const started = useRef(false);

  const set = (i: number, patch: Partial<FileState>) =>
    setItems((cur) => cur.map((it, n) => (n === i ? { ...it, ...patch } : it)));

  async function send(i: number, file: File) {
    set(i, { status: 'uploading' });
    try {
      await api.upload(`/inquiries/${created.id}/attachments`, file, {
        'X-Upload-Token': created.uploadToken,
      });
      set(i, { status: 'done' });
    } catch (e) {
      set(i, { status: 'failed', message: e instanceof ApiError ? e.message : 'Upload failed.' });
    }
  }

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in development
    started.current = true;
    void (async () => {
      for (const [i, f] of files.entries()) await send(i, f);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const failed = items.filter((i) => i.status === 'failed').length;
  const pending = items.some((i) => i.status === 'waiting' || i.status === 'uploading');

  return (
    <div className="space-y-6" aria-live="polite">
      <Alert tone="success" title="Your request is saved">
        Your reference number is <strong className="font-mono text-fg">{created.reference}</strong>. Keep it
        if you want to follow up.
      </Alert>
      {created.emailStatus === 'sent' ? (
        <p className="text-muted">
          A confirmation was sent to <strong className="text-fg">{email}</strong>. I will reply to that
          address.
        </p>
      ) : (
        <Alert tone="warning" title="Confirmation email not sent">
          Your request is saved, but the confirmation email could not be sent right now. I can still see your
          request and will reply to {email}.
        </Alert>
      )}
      {items.length > 0 && (
        <section aria-labelledby="files-h" className="space-y-3">
          <h2 id="files-h" className="text-lg font-semibold">
            Attachments
          </h2>
          <ul className="divide-y divide-line rounded-md border border-line text-sm">
            {items.map((it, i) => (
              <li
                key={`${it.file.name}-${i}`}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
              >
                <span className="min-w-0 truncate">{it.file.name}</span>
                <span className="flex items-center gap-3">
                  <span
                    className={
                      it.status === 'done' ? 'text-ok' : it.status === 'failed' ? 'text-bad' : 'text-muted'
                    }
                  >
                    {
                      {
                        waiting: 'Waiting',
                        uploading: 'Uploading',
                        done: 'Uploaded',
                        failed: it.message ?? 'Failed',
                      }[it.status]
                    }
                  </span>
                  {it.status === 'failed' && (
                    <Button
                      variant="secondary"
                      onClick={() => void send(i, it.file)}
                      aria-label={`Retry ${it.file.name}`}
                    >
                      Retry
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {!pending && failed === 0 && <p className="text-sm text-ok">All files were uploaded.</p>}
          {!pending && failed > 0 && (
            <p className="text-sm text-muted">
              Your request is saved either way. Retry the failed files, or mention them when I reply.
            </p>
          )}
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        <Link to="/" className={buttonClass('secondary')}>
          Back to the home page
        </Link>
        {onReset && (
          <Button
            variant="tertiary"
            onClick={onReset}
            disabledReason={pending ? 'Wait for uploads to finish.' : undefined}
          >
            Send another request
          </Button>
        )}
      </div>
    </div>
  );
}
