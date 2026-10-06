import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger';
const base =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors duration-200 select-none min-h-[44px] aria-disabled:cursor-not-allowed aria-disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover aria-disabled:hover:bg-accent',
  secondary: 'border border-line-strong bg-s1 text-fg hover:bg-s2 aria-disabled:hover:bg-s1',
  tertiary: 'text-muted hover:text-fg underline-offset-4 hover:underline',
  danger: 'border border-bad/40 bg-bad/10 text-bad hover:bg-bad/20',
};
export const buttonClass = (v: Variant = 'primary', extra = '') => `${base} ${variants[v]} ${extra}`;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  /** When set, the button is disabled and the reason is shown to everyone, not only on hover. */
  disabledReason?: string;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = 'primary',
    loading,
    disabledReason,
    className = '',
    children,
    onClick,
    type = 'button',
    ...rest
  },
  ref,
) {
  const reasonId = useId();
  const disabled = Boolean(disabledReason) || loading || rest.disabled;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        ref={ref}
        type={type}
        {...rest}
        aria-disabled={disabled || undefined}
        aria-describedby={disabledReason ? reasonId : rest['aria-describedby']}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          onClick?.(e);
        }}
        className={buttonClass(variant, className)}
      >
        {loading && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
        )}
        {children}
        {loading && <span className="sr-only">Working</span>}
      </button>
      {disabledReason && (
        <span id={reasonId} className="text-xs text-faint">
          {disabledReason}
        </span>
      )}
    </span>
  );
});

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...rest
}: LinkProps & { variant?: Variant }) {
  return <Link {...rest} className={buttonClass(variant, className)} />;
}

export const Spinner = ({ label = 'Loading' }: { label?: string }) => (
  <span role="status" className="inline-flex items-center gap-2 text-sm text-muted">
    <span
      aria-hidden
      className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-r-transparent"
    />
    {label}
  </span>
);
export type { ReactNode };
