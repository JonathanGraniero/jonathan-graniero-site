import clsx from 'clsx';
import { useId, type ReactElement, cloneElement } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement<Record<string, unknown>>;
}

export const inputClass =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 dark:bg-zinc-900 dark:text-zinc-100';

/** Wires label, hint and error message to the input via ids for screen readers. */
export function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
        className: clsx(
          inputClass,
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
            : 'border-zinc-300 focus:border-accent-500 focus:ring-accent-500/30 dark:border-zinc-700',
          children.props.className as string | undefined,
        ),
      })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-zinc-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
