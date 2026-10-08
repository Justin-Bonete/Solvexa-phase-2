import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { FormField, Input, Select, Textarea } from './Form';

type Base = { label: string; hint?: string; error?: string | undefined; required?: boolean };

/** Label + hint + error wired to the control. Spread react-hook-form's `register(...)` onto it. */
export const TextField = forwardRef<HTMLInputElement, Base & InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, hint, error, required, ...rest }, ref) {
    return (
      <FormField
        label={label}
        {...(hint ? { hint } : {})}
        {...(error ? { error } : {})}
        {...(required ? { required } : {})}
      >
        {(a) => (
          <Input
            ref={ref}
            id={a.id}
            invalid={a.invalid}
            {...(a.describedBy ? { describedBy: a.describedBy } : {})}
            {...rest}
          />
        )}
      </FormField>
    );
  },
);

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  Base & TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextAreaField({ label, hint, error, required, ...rest }, ref) {
  return (
    <FormField
      label={label}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
      {...(required ? { required } : {})}
    >
      {(a) => (
        <Textarea
          ref={ref}
          id={a.id}
          invalid={a.invalid}
          {...(a.describedBy ? { describedBy: a.describedBy } : {})}
          {...rest}
        />
      )}
    </FormField>
  );
});

export const SelectField = forwardRef<
  HTMLSelectElement,
  Base & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode; placeholder?: string }
>(function SelectField({ label, hint, error, required, children, placeholder = 'Choose one', ...rest }, ref) {
  return (
    <FormField
      label={label}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
      {...(required ? { required } : {})}
    >
      {(a) => (
        <Select
          ref={ref}
          id={a.id}
          invalid={a.invalid}
          {...(a.describedBy ? { describedBy: a.describedBy } : {})}
          defaultValue=""
          {...rest}
        >
          <option value="">{placeholder}</option>
          {children}
        </Select>
      )}
    </FormField>
  );
});

export const FormSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset className="space-y-5 border-t border-line pt-8">
    <legend className="text-h3">{title}</legend>
    {children}
  </fieldset>
);
