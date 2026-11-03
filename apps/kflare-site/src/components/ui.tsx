import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';

export function Container({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Arrow() {
  return <Icon name="arrow" className="ml-0.5 inline size-[0.85em] align-[-0.05em]" />;
}

/** Opens in a new tab, marked with an arrow unless the caller places one. */
export function ExternalLink({
  href,
  className,
  arrow = true,
  children,
}: {
  href: string;
  className?: string;
  arrow?: boolean;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      {arrow && <Arrow />}
    </a>
  );
}

/** A link that stays on the site for a path, and opens a new tab for anything else. */
export function SiteLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return href.startsWith('/') ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <ExternalLink href={href} className={className}>
      {children}
    </ExternalLink>
  );
}

const BUTTON = {
  primary: 'bg-accent text-accent-ink hover:opacity-90',
  secondary: 'border border-line bg-panel text-ink hover:border-dim',
} as const;

export function ButtonLink({
  href,
  variant = 'primary',
  external = false,
  children,
}: {
  href: string;
  variant?: keyof typeof BUTTON;
  external?: boolean;
  children: ReactNode;
}) {
  const className = `inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${BUTTON[variant]}`;
  return external ? (
    <ExternalLink href={href} className={className}>
      {children}
    </ExternalLink>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/** A page section: eyebrow, heading and intro, then its content. */
export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-line">
      <Container className="py-20 sm:py-24">
        <p className="font-mono text-xs font-medium tracking-wider text-accent uppercase">
          {eyebrow}
        </p>
        <h2
          id={`${id}-title`}
          className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {title}
        </h2>
        {intro && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-dim">{intro}</p>}
        <div className="mt-12">{children}</div>
      </Container>
    </section>
  );
}

/** Inline code in running text. */
export function C({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-accent-soft px-1 py-0.5 font-mono text-[0.85em] text-ink">
      {children}
    </code>
  );
}

/** Text from content.ts, with its `backticked` spans as inline code. */
export function WithCode({ text }: { text: string }) {
  return text.split('`').map((part, i) => (i % 2 ? <C key={i}>{part}</C> : part));
}
