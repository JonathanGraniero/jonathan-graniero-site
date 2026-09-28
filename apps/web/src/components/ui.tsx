import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={clsx('mx-auto w-full max-w-5xl px-5 sm:px-8', className)} {...props} />;
}

const buttonStyles = {
  primary:
    'bg-accent-700 text-white hover:bg-accent-800 dark:bg-accent-500 dark:text-zinc-950 dark:hover:bg-accent-400',
  secondary:
    'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
  ghost:
    'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerGhost: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40',
} as const;

type Variant = keyof typeof buttonStyles;
const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';

export function Button({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: Variant }) {
  return (
    <button type="button" className={clsx(base, buttonStyles[variant], className)} {...props} />
  );
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...props
}: LinkProps & { variant?: Variant }) {
  return <Link className={clsx(base, buttonStyles[variant], className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx('animate-pulse rounded-md bg-zinc-200/80 dark:bg-zinc-800', className)}
    />
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
      {children && <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{children}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center dark:border-red-900/60 dark:bg-red-950/30"
    >
      <p className="font-medium text-red-800 dark:text-red-300">Couldn&apos;t load this content</p>
      <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/70">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
