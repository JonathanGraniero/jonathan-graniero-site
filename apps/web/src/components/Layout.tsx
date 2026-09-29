import clsx from 'clsx';
import { useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigate,
  useNavigation,
} from 'react-router';
import { FOCUS_SEARCH_EVENT, useHotkeys } from '../lib/hotkeys.ts';
import { useProfile } from '../lib/queries.ts';
import { useTheme } from '../lib/theme-context.ts';
import { ThemeToggle } from './ThemeToggle.tsx';
import { Container, Kbd } from './ui.tsx';

/** `key` is the shortcut letter used with `g` (e.g. `g b` → blog). */
const NAV = [
  { to: '/blog', label: 'blog', key: 'b' },
  { to: '/projects', label: 'projects', key: 'p' },
  { to: '/about', label: 'about', key: 'a' },
  { to: '/contact', label: 'contact', key: 'c' },
];

function NavItem({ to, label, hotkey }: { to: string; label: string; hotkey: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'px-2 py-1 text-xs transition',
          isActive ? 'bg-ink text-bg' : 'text-dim hover:text-signal',
        )
      }
    >
      {/* Underline the shortcut letter, like a menu accelerator. */}
      {label.split('').map((ch, i) =>
        ch === hotkey && label.indexOf(hotkey) === i ? (
          <span key={i} className="underline decoration-signal underline-offset-4">
            {ch}
          </span>
        ) : (
          ch
        ),
      )}
    </NavLink>
  );
}

function HelpPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows: [string, string][] = [
    ['g h', 'home'],
    ...NAV.map((n): [string, string] => [`g ${n.key}`, n.label]),
    ['/', 'search posts'],
    ['t', 'cycle theme'],
    ['?', 'toggle this help'],
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="w-full max-w-sm border border-line bg-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs text-faint">
          <span className="text-signal">$</span> man site
        </p>
        <h2 id="help-title" className="mt-3 text-sm font-semibold">
          Keyboard shortcuts
        </h2>
        <table className="mt-4 w-full text-xs">
          <tbody>
            {rows.map(([keys, what]) => (
              <tr key={keys} className="border-t border-line/60">
                <td className="py-2 pr-4">
                  {keys.split(' ').map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </td>
                <td className="py-2 text-dim">{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={onClose} className="mt-4 text-xs text-dim hover:text-signal">
          [esc] close
        </button>
      </div>
    </div>
  );
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { data: profile } = useProfile();
  const { preference, setPreference } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);

  const path = location.pathname === '/' ? '~' : `~${location.pathname}`;

  useHotkeys({
    'g h': () => void navigate('/'),
    ...Object.fromEntries(NAV.map((n) => [`g ${n.key}`, () => void navigate(n.to)])),
    '/': () => {
      if (location.pathname === '/blog') window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
      else void navigate('/blog', { state: { focusSearch: true } });
    },
    t: () =>
      setPreference(preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system'),
    '?': () => setHelpOpen((o) => !o),
  });

  return (
    <div className="scanlines flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-signal focus:px-4 focus:py-2 focus:text-signal-ink"
      >
        Skip to content
      </a>
      {navigation.state === 'loading' && (
        <div
          className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-signal"
          role="progressbar"
          aria-label="Loading page"
        />
      )}

      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-sm">
        <Container className="flex h-12 items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center text-xs" aria-label="Home">
            <span className="font-semibold text-signal">jg@graniero</span>
            <span className="text-faint">:</span>
            <span className="truncate text-dim">{path}</span>
            <span className="text-faint">$</span>
            <span aria-hidden className="cursor-block ml-1.5 hidden sm:inline-block" />
          </Link>
          <div className="flex items-center gap-1">
            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <NavItem key={n.to} to={n.to} label={n.label} hotkey={n.key} />
              ))}
            </nav>
            <span className="mx-2 hidden h-4 w-px bg-line md:block" aria-hidden />
            <ThemeToggle />
          </div>
        </Container>
        {/* Small screens: nav as a second, scrollable row. */}
        <nav aria-label="Mobile" className="border-t border-line md:hidden">
          <Container className="flex gap-1 overflow-x-auto py-1.5">
            {NAV.map((n) => (
              <NavItem key={n.to} to={n.to} label={n.label} hotkey={n.key} />
            ))}
          </Container>
        </nav>
      </header>

      <main id="main" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>

      {/* Editor-style status line. */}
      <footer className="mt-24 border-t border-line text-[11px]">
        <Container className="flex flex-wrap items-stretch justify-between gap-x-4 px-0! sm:px-8!">
          <div className="flex items-stretch">
            <span className="bg-signal px-3 py-2 font-semibold text-signal-ink">NORMAL</span>
            <span className="border-r border-line px-3 py-2 text-dim">
              ctx: {profile?.name.toLowerCase().replace(/\s+/g, '-') ?? 'jonathan-graniero'}
            </span>
            <span className="hidden px-3 py-2 text-faint sm:block">
              © {new Date().getFullYear()}
            </span>
          </div>
          <ul className="flex items-center gap-4 px-4 py-2 text-dim sm:px-0">
            {profile?.social.github && (
              <li>
                <a
                  href={profile.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-signal"
                >
                  github
                </a>
              </li>
            )}
            {profile?.social.linkedin && (
              <li>
                <a
                  href={profile.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-signal"
                >
                  linkedin
                </a>
              </li>
            )}
            <li>
              <a href="/api/rss.xml" className="hover:text-signal">
                rss
              </a>
            </li>
            <li>
              <button type="button" onClick={() => setHelpOpen(true)} className="hover:text-signal">
                <Kbd>?</Kbd> keys
              </button>
            </li>
          </ul>
        </Container>
      </footer>

      {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
      <ScrollRestoration />
    </div>
  );
}
