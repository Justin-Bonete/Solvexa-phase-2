import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Feedback';

export default function NotFound() {
  return (
    <Container className="py-24">
      <h1 className="text-h1">That page does not exist</h1>
      <p className="mt-3 max-w-prose text-muted">
        The link may be old or mistyped. You can start again from the home page.
      </p>
      <div className="mt-8">
        <ButtonLink to="/">Go to the home page</ButtonLink>
      </div>
    </Container>
  );
}
