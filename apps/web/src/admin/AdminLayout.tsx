import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Link, NavLink, Outlet } from 'react-router';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { Container } from '../components/ui.tsx';
import { queries } from '../lib/queries.ts';
import { useCurrentUser, useLogout } from './useAuth.ts';

const navClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    ' px-3 py-1.5 text-sm font-medium transition',
    isActive ? 'bg-line/40 text-ink' : 'text-faint hover:text-ink',
  );

export function AdminLayout() {
  const me = useCurrentUser();
  const logout = useLogout();
  const stats = useQuery({ ...queries.messageStats(), enabled: Boolean(me.data) });
  const unread = stats.data?.unread ?? 0;

  return (
    <div className="min-h-dvh bg-line/40">
      <title>Admin · Jonathan Graniero</title>
      <meta name="robots" content="noindex" />
      <header className="border-b border-line bg-panel">
        <Container className="flex h-14 max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="font-semibold tracking-tight text-ink">
              <span className="mr-2 bg-signal px-1.5 py-0.5 font-mono text-xs text-white">JG</span>
              Admin
            </Link>
            {me.data && (
              <nav aria-label="Admin" className="flex items-center gap-1">
                <NavLink to="/admin" end className={navClass}>
                  Posts
                </NavLink>
                <NavLink to="/admin/messages" className={navClass}>
                  Messages
                  {unread > 0 && (
                    <span
                      className="ml-1.5 bg-signal px-1.5 py-0.5 text-[10px] font-semibold text-signal-ink"
                      aria-label={`${unread} unread`}
                    >
                      {unread}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/admin/profile" className={navClass}>
                  Profile
                </NavLink>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="hidden text-faint hover:text-ink sm:inline">
              View site ↗
            </Link>
            <ThemeToggle />
            {me.data && (
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="px-3 py-1.5 font-medium text-dim hover:bg-line/40"
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
