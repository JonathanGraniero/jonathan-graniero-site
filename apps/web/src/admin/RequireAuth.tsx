import { Navigate, Outlet, useLocation } from 'react-router';
import { ErrorState } from '../components/ui.tsx';
import { ApiError } from '../lib/api.ts';
import { useCurrentUser } from './useAuth.ts';

/** Gate for admin routes: redirects to login (remembering where you were) on 401. */
export function RequireAuth() {
  const me = useCurrentUser();
  const location = useLocation();

  if (me.isPending) {
    return (
      <div className="grid place-items-center py-32" role="status" aria-label="Checking session">
        <span className="size-6 animate-spin rounded-full border-2 border-zinc-300 border-t-accent-600" />
      </div>
    );
  }
  if (me.isError) {
    if (me.error instanceof ApiError && me.error.status === 401) {
      const next = encodeURIComponent(location.pathname + location.search);
      return <Navigate to={`/admin/login?next=${next}`} replace />;
    }
    return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  }
  return <Outlet />;
}
