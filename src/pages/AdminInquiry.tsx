import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ACCESS_LABELS,
  CURRENCIES,
  ONLINE_LABELS,
  PRIORITY_LABELS,
  PROJECT_TYPE_LABELS,
  REQUEST_STATUSES,
  STATUS_LABELS,
  TIMELINE_LABELS,
  USER_BAND_LABELS,
  type RequestStatus,
} from '@shared/enums';
import { api, ApiError } from '@/lib/api';
import { Alert, Badge, Card, Container, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { FormField, Select, Textarea } from '@/components/ui/Form';
import { AdminNav, StatusBadge, fmtDate } from '@/features/admin/shared';
import NotFound from './NotFound';

type Detail = {
  request: Record<string, string | number | boolean | null> & {
    id: string;
    reference: string;
    kind: 'inquiry' | 'assessment';
    status: RequestStatus;
    internalNotes: string | null;
    createdAt: string;
  };
  assessment: Record<string, string | null> | null;
  attachments: { id: string; originalName: string; mime: string; sizeBytes: number; scanStatus: string }[];
};

const lookup = (map: Record<string, string>, v: unknown) =>
  typeof v === 'string' && v ? (map[v] ?? v) : null;
const size = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

function Facts({ rows }: { rows: [string, string | number | boolean | null | undefined][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!shown.length) return <p className="text-sm text-faint">Nothing provided.</p>;
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {shown.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-sm text-faint">{k}</dt>
          {/* Visitor-supplied text is rendered as text only: React escapes it, and addresses are never turned into links. */}
          <dd className="whitespace-pre-wrap break-words">
            {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AdminInquiry() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'inquiry', id],
    queryFn: () => api.get<Detail>(`/admin/inquiries/${id}`),
    retry: false,
  });
  const [status, setStatus] = useState<RequestStatus>('new');
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data) {
      setStatus(q.data.request.status);
      setNotes(q.data.request.internalNotes ?? '');
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => api.patch(`/admin/inquiries/${id}`, { status, internalNotes: notes }),
    onSuccess: async () => {
      setSaved(true);
      await qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/admin/inquiries/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin'] });
      nav('/admin/inquiries', { replace: true });
    },
  });

  if (q.isError && q.error instanceof ApiError && q.error.status === 404) return <NotFound />;
  if (q.isPending)
    return (
      <Container className="space-y-4 py-12">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </Container>
    );
  if (q.isError)
    return (
      <Container className="py-12">
        <ErrorState message="Could not load this inquiry." onRetry={() => void q.refetch()} />
      </Container>
    );

  const { request: r, assessment: a, attachments } = q.data;
  const budget =
    r.budgetAmount !== null &&
    r.budgetCurrency &&
    CURRENCIES.includes(r.budgetCurrency as (typeof CURRENCIES)[number])
      ? `${Number(r.budgetAmount).toLocaleString()} ${r.budgetCurrency}`
      : null;

  return (
    <Container className="space-y-8 py-12">
      <AdminNav />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link className="hover:text-fg" to="/admin/inquiries">
          Inquiries
        </Link>{' '}
        <span aria-hidden>/</span> <span aria-current="page">{r.reference}</span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-h1 font-mono">{r.reference}</h1>
        <StatusBadge status={r.status} label={STATUS_LABELS[r.status]} />
        <Badge>{r.kind === 'assessment' ? 'System assessment' : 'Inquiry'}</Badge>
      </div>
      <p className="text-sm text-muted">
        Received <time dateTime={r.createdAt}>{fmtDate(r.createdAt)}</time>
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-h3">Contact</h2>
            <div className="mt-4">
              <Facts
                rows={[
                  ['Name', r.contactName],
                  ['Email', r.contactEmail],
                  ['Organization', r.organization],
                  ['Phone', r.phone],
                  ['Country', r.country],
                  ['Industry', r.industry],
                  ['Signed-in client', r.clientId ? 'Yes' : 'No'],
                ]}
              />
            </div>
          </Card>
          <Card>
            <h2 className="text-h3">{r.kind === 'assessment' ? 'Summary' : 'Project'}</h2>
            <div className="mt-4">
              <Facts
                rows={[
                  ['Path', r.path],
                  ['Project type', lookup(PROJECT_TYPE_LABELS, r.projectType)],
                  ['Has an existing system', r.hasExistingSystem],
                  ['Current technology', r.currentTechnology],
                  ['System address (not clickable on purpose)', r.systemUrl],
                  ['Description', r.description],
                  ['Main problems', r.mainProblems],
                  ['Required features', r.requiredFeatures],
                  ['Expected users', lookup(USER_BAND_LABELS, r.expectedUsers)],
                  ['Budget', budget],
                  ['Timeline', lookup(TIMELINE_LABELS, r.timeline)],
                  ['Priority', lookup(PRIORITY_LABELS, r.priority)],
                  ['Additional information', r.additionalInfo],
                ]}
              />
            </div>
          </Card>
          {a && (
            <Card>
              <h2 className="text-h3">System assessment</h2>
              <div className="mt-4">
                <Facts
                  rows={[
                    ['System', a.currentSystem],
                    ['Technology', a.technology],
                    ['Original developer', a.originalDeveloper],
                    ['Online', lookup(ONLINE_LABELS, a.isOnline)],
                    ['Problems', a.problems],
                    ['Errors observed', a.errorsObserved],
                    ['Features to improve', a.featuresToImprove],
                    ['Desired improvements', a.desiredImprovements],
                    ['Users', lookup(USER_BAND_LABELS, a.userCount)],
                    ['Database', a.databaseType],
                    ['Has source code access', lookup(ACCESS_LABELS, a.hasSourceAccess)],
                    ['Has server access', lookup(ACCESS_LABELS, a.hasServerAccess)],
                    ['Has database access', lookup(ACCESS_LABELS, a.hasDbAccess)],
                  ]}
                />
              </div>
            </Card>
          )}
          <Card>
            <h2 className="text-h3">Attachments</h2>
            {attachments.length === 0 ? (
              <p className="mt-3 text-sm text-faint">No files were attached.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted">
                  Files are not virus-scanned. Treat them as untrusted and open them in a safe environment.
                </p>
                <ul className="mt-4 divide-y divide-line rounded-md border border-line text-sm">
                  {attachments.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                      <span className="min-w-0 break-words">
                        {f.originalName}{' '}
                        <span className="text-faint">
                          ({size(f.sizeBytes)}, {f.mime})
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Badge tone="warn">
                          {f.scanStatus === 'not_scanned' ? 'Not scanned' : f.scanStatus}
                        </Badge>
                        <a
                          className="text-accent underline-offset-4 hover:underline"
                          href={`/api/v1/admin/attachments/${f.id}`}
                          download
                        >
                          Download<span className="sr-only"> {f.originalName}</span>
                        </a>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>

        <aside className="space-y-6" aria-label="Manage">
          <Card className="space-y-4">
            <h2 className="text-h3">Manage</h2>
            {save.isError && (
              <Alert tone="danger">
                {save.error instanceof ApiError ? save.error.message : 'Could not save.'}
              </Alert>
            )}
            {saved && !save.isPending && !save.isError && <Alert tone="success">Saved.</Alert>}
            <FormField label="Status">
              {(f) => (
                <Select
                  id={f.id}
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as RequestStatus);
                    setSaved(false);
                  }}
                >
                  {REQUEST_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label="Internal notes" hint="Only admins can see these.">
              {(f) => (
                <Textarea
                  id={f.id}
                  rows={5}
                  maxLength={5000}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setSaved(false);
                  }}
                />
              )}
            </FormField>
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              Save changes
            </Button>
          </Card>
          <Card className="space-y-3">
            <h2 className="text-h3">Remove</h2>
            <p className="text-sm text-muted">
              Hides this request from the inbox. The record is kept in the database.
            </p>
            {!confirmDelete ? (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete request
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
                  Confirm delete
                </Button>
                <Button variant="tertiary" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            )}
            {remove.isError && <Alert tone="danger">Could not delete.</Alert>}
          </Card>
        </aside>
      </div>
    </Container>
  );
}
