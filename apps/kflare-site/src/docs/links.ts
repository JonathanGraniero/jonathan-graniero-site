import { DOCS } from '../content.ts';
import { repoUrl, sampleKind } from './reference.ts';

/** The guides rendered from kflare's repository: their path there, and here. */
export const GUIDES = {
  deploy: { file: 'docs/deploy.md', path: DOCS.deploy },
  architecture: { file: 'ARCHITECTURE.md', path: DOCS.architecture },
} as const;

/**
 * Where a link in one of the guides should go on this site. Links between the
 * guides and to the samples stay here; anything else in the repository opens
 * on GitHub, at the release the docs describe.
 */
export function guideLink(href: string, from: string): { href: string; external: boolean } {
  if (href.startsWith('#')) return { href, external: false };
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return { href, external: true };
  const url = new URL(href, `https://repo.invalid/${from}`);
  const path = decodeURIComponent(url.pathname.slice(1));
  const guide = Object.values(GUIDES).find((g) => g.file === path);
  if (guide) return { href: guide.path + url.hash, external: false };
  const sample = /^config\/samples\/([^/]+\.yaml)$/.exec(path)?.[1];
  const kind = sample && sampleKind(sample);
  if (kind) return { href: `/docs/reference/${kind.slug}/#samples`, external: false };
  return { href: repoUrl(path, url.hash), external: true };
}
