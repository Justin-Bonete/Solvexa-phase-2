import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Feedback';

export function IntakePage({ children, heading }: { children: ReactNode; heading: string }) {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link className="hover:text-fg" to="/contact">
          Contact
        </Link>{' '}
        <span aria-hidden>/</span> <span aria-current="page">{heading}</span>
      </nav>
      <h1 className="sr-only">{heading}</h1>
      <div className="mt-6">{children}</div>
    </Container>
  );
}
