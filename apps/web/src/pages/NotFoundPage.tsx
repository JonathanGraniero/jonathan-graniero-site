import { Seo } from '../components/Seo.tsx';
import { ButtonLink, Container } from '../components/ui.tsx';

export function NotFoundPage({
  message = "The page you're looking for doesn't exist.",
}: {
  message?: string;
}) {
  return (
    <Container className="flex flex-col items-center py-28 text-center">
      <Seo title="Not found" />
      <p className="font-mono text-sm text-accent-700 dark:text-accent-400">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Page not found
      </h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">{message}</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/">Go home</ButtonLink>
        <ButtonLink to="/blog" variant="secondary">
          Browse the blog
        </ButtonLink>
      </div>
    </Container>
  );
}
