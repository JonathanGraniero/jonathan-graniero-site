/** kflare's mark: a flare on a rounded square. public/favicon.svg is the same drawing. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <path
        d="M15 6c.8 5.3 3.9 8.4 9.2 9.2-5.3.8-8.4 3.9-9.2 9.2-.8-5.3-3.9-8.4-9.2-9.2C11.1 14.4 14.2 11.3 15 6Z"
        className="fill-accent-ink"
      />
      <circle cx="23.5" cy="8.5" r="2" className="fill-accent-ink" />
    </svg>
  );
}
