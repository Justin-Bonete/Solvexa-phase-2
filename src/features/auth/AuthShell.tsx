import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Feedback';

export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Container className="py-12 sm:py-20">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-h2">{title}</h1>
        {intro && <p className="mt-2 text-muted">{intro}</p>}
        <div className="mt-8 space-y-5">{children}</div>
        {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-muted">{footer}</div>}
      </div>
    </Container>
  );
}
