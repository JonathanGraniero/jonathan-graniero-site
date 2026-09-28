import clsx from 'clsx';
import { Link, NavLink, Outlet } from 'react-router';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { Container } from '../components/ui.tsx';
import { useCurrentUser, useLogout } from './useAuth.ts';

const navClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    'rounded-lg px-3 py-1.5 text-sm font-medium transition',
    isActive
      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
  );

export function AdminLayout() {
  const me = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <title>Admin · Jonathan Graniero</title>
      <meta name="robots" content="noindex" />
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <Container className="flex h-14 max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              <span className="mr-2 rounded bg-accent-700 px-1.5 py-0.5 font-mono text-xs text-white dark:bg-accent-500 dark:text-zinc-950">
                JG
              </span>
              Admin
            </Link>
            {me.data && (
              <nav aria-label="Admin" className="flex items-center gap-1">
                <NavLink to="/admin" end className={navClass}>
                  Posts
                </NavLink>
                <NavLink to="/admin/profile" className={navClass}>
                  Profile
                </NavLink>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              to="/"
              className="hidden text-zinc-500 hover:text-zinc-900 sm:inline dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              View site ↗
            </Link>
            <ThemeToggle />
            {me.data && (
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="rounded-lg px-3 py-1.5 font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                title={me.data.email}
              >
                Sign out
              </button>
            )}
          </div>
        </Container>
      </header>
      <main id="main">
        <Outlet />
      </main>
    </div>
  );
}
