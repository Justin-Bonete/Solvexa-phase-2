import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (a: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

/** Wires label, hint and error message to the control so screen readers announce them. */
export function FormField({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errId} role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

const control =
  'block w-full rounded-md border border-line-strong bg-s1 px-3 py-2.5 text-base text-fg placeholder:text-faint transition-colors focus-visible:border-accent aria-[invalid=true]:border-bad min-h-[44px]';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; describedBy?: string }
>(function Input({ invalid, describedBy, className = '', ...p }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy ?? p['aria-describedby']}
      {...p}
      className={`${control} ${className}`}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; describedBy?: string }
>(function Textarea({ invalid, describedBy, className = '', ...p }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy ?? p['aria-describedby']}
      {...p}
      className={`${control} min-h-[120px] ${className}`}
    />
  );
});

export const Checkbox = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; error?: string }
>(function Checkbox({ label, error, ...p }, ref) {
  const id = useId();
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-3">
        <input
          id={id}
          ref={ref}
          type="checkbox"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          {...p}
          className="mt-1 h-5 w-5 rounded border-line-strong bg-s1 accent-[rgb(var(--c-accent))]"
        />
        <label htmlFor={id} className="text-sm text-muted">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
});
