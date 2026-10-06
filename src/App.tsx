import { Suspense, useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SiteLayout from '@/layouts/SiteLayout';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { Container, Skeleton } from '@/components/ui/Feedback';
import { appRoutes, lazyOf, notFoundLoad } from '@/routes';

const Fallback = () => (
  <Container className="space-y-4 py-12">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-24 w-full" />
  </Container>
);

/** Providers and routing only. No business logic lives here. */
export default function App() {
  const client = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }),
    [],
  );
  const pages = useMemo(() => appRoutes.map((r) => ({ ...r, Page: lazyOf(r.load) })), []);
  const NotFound = useMemo(() => lazyOf(notFoundLoad), []);
  return (
    <QueryClientProvider client={client}>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route element={<SiteLayout />}>
            {pages
              .filter((p) => !p.guard)
              .map((p) => (
                <Route key={p.path} path={p.path} element={<p.Page />} />
              ))}
            {(['client', 'admin'] as const).map((g) => (
              <Route key={g} element={<RequireAuth role={g} />}>
                {pages
                  .filter((p) => p.guard === g)
                  .map((p) => (
                    <Route key={p.path} path={p.path} element={<p.Page />} />
                  ))}
              </Route>
            ))}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </QueryClientProvider>
  );
}
