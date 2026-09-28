import clsx from 'clsx';
import { useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router';
import { useProfile } from '../lib/queries.ts';
import { ThemeToggle } from './ThemeToggle.tsx';
import { Container } from './ui.tsx';

const NAV = [
  { to: '/blog', label: 'Blog' },
  { to: '/about', label: 'About' },
  { to: '/projects', label: 'Projects' },
  { to: '/contact', label: 'Contact' },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'rounded-lg px-3 py-2 text-sm font-medium transition',
    isActive
      ? 'text-zinc-900 dark:text-zinc-50'
      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
  );

export function Layout() {
  const location = useLocation();
  const navigation = useNavigation();
  const { data: profile } = useProfile();
  // Remember which page the menu was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === location.pathname;

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow dark:focus:bg-zinc-900"
      >
        Skip to content
      </a>
      {navigation.state === 'loading' && (
        <div
          className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-accent-500"
          role="progressbar"
          aria-label="Loading page"
        />
      )}

      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/80">
        <Container className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="group flex items-center gap-2.5 font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-accent-700 font-mono text-sm text-white transition group-hover:rotate-6 dark:bg-accent-500 dark:text-zinc-950">
              JG
            </span>
            <span className="hidden sm:inline">{profile?.name ?? 'Jonathan Graniero'}</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
            <span className="mx-2 h-5 w-px bg-zinc-200 dark:bg-zinc-800" aria-hidden />
            <ThemeToggle />
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuPath(menuOpen ? null : location.pathname)}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </Container>
        {menuOpen && (
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="border-t border-zinc-200 md:hidden dark:border-zinc-800"
          >
            <Container className="flex flex-col py-2">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} className={navClass}>
                  {item.label}
                </NavLink>
              ))}
            </Container>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="border-t border-zinc-200 py-10 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <Container className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {profile?.name ?? 'Jonathan Graniero'}. Built with React
            &amp; NestJS.
          </p>
          <ul className="flex items-center gap-4">
            {profile?.social.github && (
              <li>
                <a
                  href={profile.social.github}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
            )}
            {profile?.social.linkedin && (
              <li>
                <a
                  href={profile.social.linkedin}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              </li>
            )}
            <li>
              <a href="/api/rss.xml" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                RSS
              </a>
            </li>
          </ul>
        </Container>
      </footer>
      <ScrollRestoration />
    </div>
  );
}
