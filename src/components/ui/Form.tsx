import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
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

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; describedBy?: string }
>(function Select({ invalid, describedBy, className = '', children, ...p }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy ?? p['aria-describedby']}
      {...p}
      className={`${control} ${className}`}
    >
      {children}
    </select>
  );
});

/** Two or more mutually exclusive choices shown as large tap targets. Uses real radio inputs, so keyboard and screen readers work natively. */
export function SegmentedControl<T extends string>({
  legend,
  value,
  onChange,
  options,
}: {
  legend: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const name = useId();
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-fg">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${value === o.value ? 'border-accent bg-accent/10 text-fg' : 'border-line-strong text-muted hover:bg-s2'}`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="h-4 w-4 accent-[rgb(var(--c-accent))]"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
