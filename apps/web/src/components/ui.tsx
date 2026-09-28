import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { ArrowRightIcon } from './icons.tsx';

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={clsx('mx-auto w-full max-w-5xl px-5 sm:px-8', className)} {...props} />;
}

const buttonStyles = {
  primary:
    'bg-zinc-900 text-white shadow-lg shadow-zinc-900/15 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:shadow-white/10 dark:hover:bg-zinc-200',
  secondary:
    'border border-zinc-300/80 bg-white/70 text-zinc-800 backdrop-blur hover:border-zinc-400 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-zinc-100 dark:hover:border-white/25 dark:hover:bg-white/10',
  ghost:
    'text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerGhost: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40',
} as const;

type Variant = keyof typeof buttonStyles;
const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-4.5 py-2 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

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
      className={clsx('animate-pulse rounded-xl bg-zinc-200/70 dark:bg-white/[0.06]', className)}
    />
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border border-zinc-200 bg-white/60 px-2.5 py-0.5 font-mono text-[11px] text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  children,
  action,
  eyebrow,
}: {
  children: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          {children}
        </h2>
      </div>
      {action}
    </div>
  );
}

/** Top-of-page title block: mono eyebrow, gradient headline, lede. */
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="animate-fade-up max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="text-gradient mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        {title}
      </h1>
      {children && (
        <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">{children}</p>
      )}
    </header>
  );
}

/** Mono link with an arrow, used for "All posts →" style actions. */
export function ArrowLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
    >
      {children}
      <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-white/15">
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
      className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center dark:border-red-900/60 dark:bg-red-950/30"
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
