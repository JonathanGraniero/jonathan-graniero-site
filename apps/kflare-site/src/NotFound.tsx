import { SiteFooter, SiteHeader, SkipLink } from './components/Layout.tsx';
import { ButtonLink, Container } from './components/ui.tsx';
import { DOCS } from './content.ts';

/** dist/404.html, served for any path without a file. */
export function NotFound() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main">
        <Container className="py-24 sm:py-32">
          <p className="font-mono text-sm font-medium text-accent">404</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Page not found</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-dim">
            There&apos;s nothing at this address. The documentation might have what you were looking
            for.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/">Back to kflare.dev</ButtonLink>
            <ButtonLink href={DOCS.home} variant="secondary">
              Documentation
            </ButtonLink>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
