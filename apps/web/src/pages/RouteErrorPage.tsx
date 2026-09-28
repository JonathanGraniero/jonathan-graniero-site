import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

/** Last-resort boundary for render errors and failed lazy route chunks. */
export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <title>Something went wrong</title>
      <p className="font-mono text-sm text-red-600">Error</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-zinc-600 dark:text-zinc-400">{message}</p>
      <div className="mt-8 flex gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-accent-700 hover:underline dark:text-accent-400"
        >
          Reload
        </button>
        <Link to="/" className="text-accent-700 hover:underline dark:text-accent-400">
          Go home
        </Link>
      </div>
    </div>
  );
}
