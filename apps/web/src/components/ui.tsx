import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={clsx('mx-auto w-full max-w-6xl px-4 sm:px-8', className)} {...props} />;
}

const buttonStyles = {
  primary: 'border-signal bg-signal text-signal-ink hover:brightness-110',
  secondary: 'border-line text-ink hover:border-signal hover:text-signal',
  ghost: 'border-transparent text-dim hover:text-ink',
  danger: 'border-err bg-err text-bg hover:brightness-110',
  dangerGhost: 'border-transparent text-err hover:border-err',
} as const;

type Variant = keyof typeof buttonStyles;
const base =
  'inline-flex items-center justify-center gap-2 border px-4 py-2 text-xs font-medium uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50';

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
  return <div aria-hidden className={clsx('animate-pulse bg-line/50', className)} />;
}

/** A Kubernetes-style label chip: `key=value` or just `value`. */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center border border-line px-1.5 py-0.5 text-[11px] text-dim',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-line px-6 py-10 text-sm">
      <p className="text-dim">
        <span className="text-faint">No resources found.</span> {title}
      </p>
      {children && <div className="mt-2 text-faint">{children}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div role="alert" className="border border-err/50 px-5 py-4 text-sm">
      <p className="text-err">Error from server: Couldn&apos;t load this content</p>
      <p className="mt-1 text-dim">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Page title rendered as the command that "produced" the page, e.g.
 * `$ kubectl get posts`, followed by a human heading.
 */
export function PageHeader({
  command,
  title,
  children,
}: {
  command: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="max-w-3xl">
      <p className="text-xs text-faint">
        <span className="text-signal">$</span> {command}
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {children && <p className="mt-4 font-serif text-lg leading-relaxed text-dim">{children}</p>}
    </header>
  );
}

/** Section heading styled as a shell command with an optional trailing action. */
export function SectionHeading({
  command,
  children,
  action,
}: {
  command: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 border-b border-line pb-3">
      <div>
        <p className="text-xs text-faint">
          <span className="text-signal">$</span> {command}
        </p>
        {children && <h2 className="mt-2 text-base font-semibold">{children}</h2>}
      </div>
      {action}
    </div>
  );
}

export function ArrowLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="shrink-0 text-xs text-dim transition hover:text-signal">
      {children} →
    </Link>
  );
}

/** Coloured status dot + label, like `● Ready`. */
export function Status({
  tone = 'ok',
  children,
}: {
  tone?: 'ok' | 'warn' | 'err' | 'idle';
  children: ReactNode;
}) {
  const color = { ok: 'text-ok', warn: 'text-warn', err: 'text-err', idle: 'text-faint' }[tone];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap', color)}>
      <span aria-hidden>●</span>
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-block min-w-[1.4em] border border-line px-1 text-center text-[10px] leading-[1.5] text-dim">
      {children}
    </kbd>
  );
}
