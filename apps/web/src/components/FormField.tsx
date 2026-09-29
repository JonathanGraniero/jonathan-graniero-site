import clsx from 'clsx';
import { useId, type ReactElement, cloneElement } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement<Record<string, unknown>>;
}

export const inputClass =
  'w-full border bg-panel px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2';

/** Wires label, hint and error message to the input via ids for screen readers. */
export function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
        className: clsx(
          inputClass,
          error
            ? 'border-err focus:border-err focus:ring-err/30'
            : 'border-line focus:border-signal focus:ring-signal/30 ',
          children.props.className as string | undefined,
        ),
      })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-err">
          {error}
        </p>
      )}
    </div>
  );
}
