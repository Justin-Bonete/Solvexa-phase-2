import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from './useAuth';
import { Container, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';

/**
 * Client-side routing guard for UX only. Real authorization is enforced by the API on every request.
 */
export function RequireAuth({ role }: { role: 'admin' | 'client' }) {
  const { user, loading, error, refetch } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <Container className="space-y-4 py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </Container>
    );
  }
  if (error)
    return (
      <Container className="py-12">
        <ErrorState message="We could not check your session." onRetry={() => void refetch()} />
      </Container>
    );
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(loc.pathname)}`} replace />;
  if (user.role !== role) {
    return (
      <Container className="py-16">
        <ErrorState
          title="You do not have access to this page"
          message="This area is for a different type of account."
          onRetry={undefined}
        />
        <div className="mt-6 flex justify-center">
          <ButtonLink to={homeFor(user)} variant="secondary">
            Go to your area
          </ButtonLink>
        </div>
      </Container>
    );
  }
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (role === 'admin' && user.mfa !== 'verified') return <Navigate to="/mfa" replace />;
  return <Outlet />;
}
