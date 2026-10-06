import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge, Container, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';

type U = { id: string; email: string; fullName: string; status: string; role: string; createdAt: string };
type L = { id: string; action: string; actorId: string | null; createdAt: string };

const tone = (s: string) => (s === 'active' ? 'ok' : s === 'disabled' ? 'bad' : 'warn');

export default function Admin() {
  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<{ users: U[] }>('/admin/users'),
  });
  const logs = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: () => api.get<{ logs: L[] }>('/admin/activity-logs'),
  });
  return (
    <Container className="space-y-12 py-12">
      <div>
        <h1 className="text-h1">Admin</h1>
        <p className="mt-2 text-muted">
          Account management and the audit trail. More screens arrive in Phase 5.
        </p>
      </div>

      <section aria-labelledby="users-h" className="space-y-4">
        <h2 id="users-h" className="text-h3">
          Accounts
        </h2>
        {users.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : users.isError ? (
          <ErrorState message="Could not load accounts." onRetry={() => void users.refetch()} />
        ) : users.data.users.length === 0 ? (
          <EmptyState title="No accounts yet" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">User accounts</caption>
              <thead className="bg-s1 text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.data.users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">{u.fullName}</td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3">{u.role}</td>
                    <td className="px-4 py-3">
                      <Badge tone={tone(u.status)}>{u.status.replace('_', ' ')}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="log-h" className="space-y-4">
        <h2 id="log-h" className="text-h3">
          Recent activity
        </h2>
        {logs.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : logs.isError ? (
          <ErrorState message="Could not load the audit log." onRetry={() => void logs.refetch()} />
        ) : logs.data.logs.length === 0 ? (
          <EmptyState title="Nothing logged yet" />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line text-sm">
            {logs.data.logs.slice(0, 20).map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="font-mono">{l.action}</span>
                <time className="text-faint" dateTime={l.createdAt}>
                  {new Date(l.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
