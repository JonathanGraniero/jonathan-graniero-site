import { useLocation } from 'react-router';
import { Seo } from '../components/Seo.tsx';
import { ButtonLink, Container } from '../components/ui.tsx';

export function NotFoundPage({
  message = "The page you're looking for doesn't exist.",
}: {
  message?: string;
}) {
  const { pathname } = useLocation();
  return (
    <Container className="py-24">
      <Seo title="Not found" />
      <div className="max-w-2xl border border-line bg-panel p-6 font-code text-sm">
        <p>
          <span className="text-signal">$</span> kubectl get page {pathname}
        </p>
        <p className="mt-2 text-err">
          Error from server (NotFound): pages &quot;{pathname}&quot; not found
        </p>
      </div>
      <h1 className="mt-10 text-2xl font-semibold">Page not found</h1>
      <p className="mt-3 font-serif text-lg text-dim">{message}</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/">cd ~</ButtonLink>
        <ButtonLink to="/blog" variant="secondary">
          ls blog/
        </ButtonLink>
      </div>
    </Container>
  );
}
