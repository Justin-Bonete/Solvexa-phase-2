import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PROJECT_TYPE_LABELS, REQUEST_STATUSES, STATUS_LABELS, type ProjectType } from '@shared/enums';
import { api } from '@/lib/api';
import { Container, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { AdminNav, StatusBadge, fmtDate, type InboxItem } from '@/features/admin/shared';

type Page = { items: InboxItem[]; nextCursor: string | null; counts: Record<string, number> };

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function AdminInbox() {
  const [status, setStatus] = useState<string>('all');
  const [kind, setKind] = useState<string>('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const query = useInfiniteQuery({
    queryKey: ['admin', 'inbox', status, kind, q],
    initialPageParam: '' as string,
    queryFn: ({ pageParam }) =>
      api.get<Page>(
        `/admin/inquiries?status=${status}&kind=${kind}&limit=25&q=${encodeURIComponent(q)}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const counts = query.data?.pages[0]?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Container className="space-y-6 py-12">
      <AdminNav />
      <div>
        <h1 className="text-h1">Inquiries</h1>
        <p className="mt-2 text-muted">Requests and system assessments sent through the site.</p>
      </div>

      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
        <Button
          variant={status === 'all' ? 'primary' : 'secondary'}
          aria-pressed={status === 'all'}
          onClick={() => setStatus('all')}
        >
          All ({total})
        </Button>
        {REQUEST_STATUSES.map((s) => (
          <Button
            key={s}
            variant={status === s ? 'primary' : 'secondary'}
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
          >
            {STATUS_LABELS[s]} ({counts[s] ?? 0})
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="w-full sm:max-w-sm">
          <label htmlFor="inbox-search" className="mb-1.5 block text-sm font-medium">
            Search
          </label>
          <Input
            id="inbox-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, organization, reference"
            autoComplete="off"
          />
        </div>
        <div role="group" aria-label="Filter by kind" className="flex gap-2">
          {[
            ['all', 'Everything'],
            ['inquiry', 'Inquiries'],
            ['assessment', 'Assessments'],
          ].map(([v, l]) => (
            <Button
              key={v}
              variant={kind === v ? 'primary' : 'secondary'}
              aria-pressed={kind === v}
              onClick={() => setKind(v as string)}
            >
              {l}
            </Button>
          ))}
        </div>
      </div>

      {query.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState message="Could not load inquiries." onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={
            q || status !== 'all' || kind !== 'all' ? 'Nothing matches those filters' : 'No inquiries yet'
          }
        >
          {q || status !== 'all' || kind !== 'all'
            ? 'Try clearing a filter or the search.'
            : 'New requests from the contact forms will appear here.'}
        </EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Inquiries, newest first</caption>
              <thead className="bg-s1 text-muted">
                <tr>
                  {['Reference', 'From', 'Type', 'Status', 'Files', 'Received'].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-s1/60">
                    <td className="px-4 py-3 font-mono">
                      <Link
                        className="text-accent underline-offset-4 hover:underline"
                        to={`/admin/inquiries/${i.id}`}
                      >
                        {i.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{i.contactName}</span>
                      <span className="text-faint">{i.organization ?? i.contactEmail}</span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {i.kind === 'assessment'
                        ? 'System assessment'
                        : (PROJECT_TYPE_LABELS[i.projectType as ProjectType] ?? i.projectType)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={i.status} label={STATUS_LABELS[i.status]} />
                    </td>
                    <td className="px-4 py-3 text-muted">{i.attachmentCount || '-'}</td>
                    <td className="px-4 py-3 text-muted">
                      <time dateTime={i.createdAt}>{fmtDate(i.createdAt)}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.hasNextPage && (
            <Button
              variant="secondary"
              loading={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Load more
            </Button>
          )}
        </>
      )}
    </Container>
  );
}
