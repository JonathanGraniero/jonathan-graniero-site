import type { ReactNode } from 'react';
import type { IconName } from '../content.ts';

/** 24px stroke icons, drawn for this site. */
const PATHS: Record<IconName | 'arrow', ReactNode> = {
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.3 7.5 9.5 4.4-1.2 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ),
  link: (
    <>
      <path d="m9.5 14.5 5-5" />
      <path d="m11 6.5 1.2-1.2a4 4 0 0 1 5.6 5.6L16.5 12" />
      <path d="m13 17.5-1.2 1.2a4 4 0 0 1-5.6-5.6L7.5 12" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </>
  ),
  git: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="8" r="2.5" />
      <path d="M6 8.5v7M18 10.5c0 4-3.5 5-9.6 6.4" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14.1c2.6.3 4.5 2.6 4.5 5.4" />
    </>
  ),
  pause: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </>
  ),
  sync: (
    <>
      <path d="M19.5 9A8 8 0 0 0 5 7.3M4.5 15A8 8 0 0 0 19 16.7" />
      <path d="M5 3.5v4h4M19 20.5v-4h-4" />
    </>
  ),
  seal: (
    <>
      <path d="m12 3 2.3 1.7 2.9-.1.9 2.7 2.3 1.7-.9 2.7.9 2.7-2.3 1.7-.9 2.7-2.9-.1L12 21l-2.3-1.7-2.9.1-.9-2.7-2.3-1.7.9-2.7-.9-2.7 2.3-1.7.9-2.7 2.9.1L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  arrow: <path d="M7 17 17 7M9 7h8v8" />,
};

export function Icon({ name, className }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
