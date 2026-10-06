import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, setCsrfToken } from '@/lib/api';
import type { SessionUser } from '@shared/schemas/auth';

export const meKey = ['auth', 'me'] as const;

export function useAuth() {
  const q = useQuery({
    queryKey: meKey,
    queryFn: async () => {
      try {
        const r = await api.get<{ user: SessionUser; csrfToken: string }>('/auth/me');
        setCsrfToken(r.csrfToken);
        return r.user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
  return { user: q.data ?? null, loading: q.isPending, error: q.error, refetch: q.refetch };
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      setCsrfToken(null);
      qc.setQueryData(meKey, null);
      qc.clear();
    },
  });
}

/** Only same-site relative paths are accepted, so a crafted link cannot redirect off-site. */
export const safeReturnTo = (v: string | null): string | null =>
  v && /^\/(?!\/)[\w\-./?=&%]*$/.test(v) ? v : null;

export const homeFor = (u: SessionUser) =>
  u.role === 'admin' ? (u.mfa === 'verified' ? '/admin' : '/mfa') : '/portal';
