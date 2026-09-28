import clsx from 'clsx';
import { useState } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router';
import { useProfile } from '../lib/queries.ts';
import { GitHubIcon, LinkedInIcon, RssIcon } from './icons.tsx';
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
    'relative rounded-full px-3.5 py-1.5 text-sm font-medium transition',
    isActive
      ? 'bg-zinc-900/[0.06] text-zinc-900 dark:bg-white/10 dark:text-white'
      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
  );

function Logo({ name }: { name: string }) {
  return (
    <Link
      to="/"
      className="group flex items-center gap-2.5 font-semibold tracking-tight text-zinc-900 dark:text-white"
    >
      <span className="relative grid size-8 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-accent-500 to-accent2-500 font-mono text-[13px] font-bold text-white shadow-lg shadow-accent-500/20 transition group-hover:rotate-6 group-hover:scale-105">
        JG
      </span>
      <span className="hidden sm:inline">{name}</span>
    </Link>
  );
}

export function Layout() {
  const location = useLocation();
  const navigation = useNavigation();
  const { data: profile } = useProfile();
  const name = profile?.name ?? 'Jonathan Graniero';
  // Remember which page the menu was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === location.pathname;

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <div className="site-backdrop" aria-hidden />
      <div className="site-grain" aria-hidden />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow dark:focus:bg-zinc-900"
      >
        Skip to content
      </a>
      {navigation.state === 'loading' && (
        <div
          className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-gradient-to-r from-accent-500 to-accent2-500"
          role="progressbar"
          aria-label="Loading page"
        />
      )}

      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <div className="glass mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full! px-3 pl-4 shadow-lg shadow-zinc-900/5 dark:bg-zinc-950/60! dark:shadow-black/30">
          <Logo name={name} />

          <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
            <span className="mx-1.5 h-5 w-px bg-zinc-200 dark:bg-white/10" aria-hidden />
            <ThemeToggle />
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="rounded-full p-2 text-zinc-600 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/10"
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
        </div>
        {menuOpen && (
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="glass mx-auto mt-2 max-w-5xl p-2 md:hidden dark:bg-zinc-950/80!"
          >
            <div className="flex flex-col">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} className={navClass}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="mt-24 border-t border-zinc-200/70 py-10 text-sm text-zinc-500 dark:border-white/[0.06] dark:text-zinc-500">
        <Container className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-br from-accent-500 to-accent2-500 font-mono text-[10px] font-bold text-white">
              JG
            </span>
            <p>
              © {new Date().getFullYear()} {name}
            </p>
          </div>
          <ul className="flex items-center gap-1">
            {profile?.social.github && (
              <li>
                <a
                  href={profile.social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-9 place-items-center rounded-full transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="GitHub"
                >
                  <GitHubIcon className="size-4.5" />
                </a>
              </li>
            )}
            {profile?.social.linkedin && (
              <li>
                <a
                  href={profile.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-9 place-items-center rounded-full transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="LinkedIn"
                >
                  <LinkedInIcon className="size-4" />
                </a>
              </li>
            )}
            <li>
              <a
                href="/api/rss.xml"
                className="grid size-9 place-items-center rounded-full transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="RSS feed"
              >
                <RssIcon className="size-4" />
              </a>
            </li>
          </ul>
        </Container>
      </footer>
      <ScrollRestoration />
    </div>
  );
}
