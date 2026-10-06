import { useAuth } from '@/features/auth/useAuth';
import { Container, EmptyState, Card } from '@/components/ui/Feedback';

export default function Portal() {
  const { user } = useAuth();
  return (
    <Container className="space-y-8 py-12">
      <div>
        <h1 className="text-h1">Welcome{user ? `, ${user.fullName.split(' ')[0]}` : ''}</h1>
        <p className="mt-2 text-muted">
          This is your client area. Projects, requests, conversations, and tickets will appear here as those
          features are released.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-h3">Projects</h2>
          <div className="mt-4">
            <EmptyState title="No projects yet">
              Once we start working together, your project and its timeline will show up here.
            </EmptyState>
          </div>
        </Card>
        <Card>
          <h2 className="text-h3">Account</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-faint">Name</dt>
              <dd>{user?.fullName}</dd>
            </div>
            <div>
              <dt className="text-faint">Email</dt>
              <dd>{user?.email}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </Container>
  );
}
