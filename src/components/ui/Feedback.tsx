import type { ReactNode } from 'react';
import { Button } from './Button';

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: 'border-accent/40 bg-accent/10',
    success: 'border-ok/40 bg-ok/10',
    warning: 'border-warn/40 bg-warn/10',
    danger: 'border-bad/40 bg-bad/10',
  } as const;
  const icon = { info: 'Note', success: 'Done', warning: 'Warning', danger: 'Problem' } as const;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`rounded-md border p-4 text-sm ${tones[tone]}`}
    >
      <p className="font-medium text-fg">
        <span className="sr-only">{icon[tone]}: </span>
        {title}
      </p>
      <div className={title ? 'mt-1 text-muted' : 'text-fg'}>{children}</div>
    </div>
  );
}

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div aria-hidden className={`skeleton ${className}`} />
);

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="mx-auto mt-2 max-w-prose text-sm text-muted">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'This could not be loaded',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg border border-bad/40 bg-bad/5 p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {message && <p className="mx-auto mt-2 max-w-prose text-sm text-muted">{message}</p>}
      {onRetry && (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

const pillTone = {
  neutral: 'border-line-strong text-muted',
  accent: 'border-accent/40 text-accent',
  ok: 'border-ok/40 text-ok',
  warn: 'border-warn/40 text-warn',
  bad: 'border-bad/40 text-bad',
} as const;
export const Badge = ({
  tone = 'neutral',
  children,
}: {
  tone?: keyof typeof pillTone;
  children: ReactNode;
}) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${pillTone[tone]}`}
  >
    {children}
  </span>
);

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-lg border border-line bg-s1 p-6 shadow-e1 ${className}`}>{children}</div>
);

export const Container = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-container px-4 sm:px-6 md:px-8 ${className}`}>{children}</div>
);

export const PlaceholderBadge = () => <Badge tone="warn">Placeholder</Badge>;
