// Fetches what kflare.dev shows of kflare from GitHub into kflare/, which
// isn't committed, so the site follows kflare with no edits here. From the
// latest published release: the CRDs, samples and guides the docs are built
// from, and its README and chart; from main: CHANGELOG.md and ROADMAP.md, for
// what has merged since and what comes next. src/release/digest.ts turns what
// the home page lists into kflare/release.json.
//
//   npm run fetch-kflare -w @site/kflare-site
//
// CI and the deploy run it first. The build, dev server, tests and typecheck
// run it only when kflare/ has nothing yet (--if-missing): locally, run it
// again for a newer release. With GITHUB_TOKEN or GH_TOKEN set, the API call
// is authenticated: GitHub allows 60 anonymous calls an hour per address,
// and CI runners share addresses.
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest } from '../src/release/digest.ts';

const REPO = 'JonathanGraniero/kflare';
const dest = new URL('../kflare/', import.meta.url).pathname;

if (process.argv.includes('--if-missing') && existsSync(join(dest, 'release.json'))) {
  process.exit(0);
}

// The release marked Latest: published, and neither a draft nor a prerelease.
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
  headers: {
    accept: 'application/vnd.github+json',
    ...(token && { authorization: `Bearer ${token}` }),
  },
});
if (!response.ok) {
  throw new Error(
    `GitHub answered ${response.status} for kflare's latest release: ${await response.text()}`,
  );
}
const { tag_name: tag, published_at: publishedAt } = await response.json();
if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`kflare's latest release has the tag ${tag}`);

const checkout = mkdtempSync(join(tmpdir(), 'kflare-'));
try {
  const url = `https://github.com/${REPO}`;
  const git = (...args) => execFileSync('git', ['-C', checkout, ...args], { encoding: 'utf8' });
  // Fetched by ref: newer git warns that a clone of an annotated tag "is not a commit".
  git('init', '--quiet');
  git('fetch', '--quiet', '--depth', '1', url, `refs/tags/${tag}`);
  git('-c', 'advice.detachedHead=false', 'checkout', '--quiet', 'FETCH_HEAD');
  git('fetch', '--quiet', '--depth', '1', url, 'main');
  const rev = (name) => git('rev-parse', name).trim();
  const atTag = (...path) => readFileSync(join(checkout, ...path), 'utf8');
  const yamlIn = (dir, skip = []) =>
    readdirSync(join(checkout, dir))
      .filter((name) => name.endsWith('.yaml') && !skip.includes(name))
      .sort();

  // Everything is read before kflare/ is replaced, so a failure leaves it as it was.
  const crds = yamlIn('config/crd/bases');
  const { release, warnings } = digest({
    source: {
      repo: url,
      tag,
      commit: rev('HEAD'),
      publishedAt,
      main: rev('FETCH_HEAD'),
      changelog: rev('FETCH_HEAD:CHANGELOG.md'),
      roadmap: rev('FETCH_HEAD:ROADMAP.md'),
    },
    readme: atTag('README.md'),
    chart: atTag('helm/kflare/Chart.yaml'),
    crds: crds.map((name) => atTag('config/crd/bases', name)),
    changelog: git('show', 'FETCH_HEAD:CHANGELOG.md'),
    roadmap: git('show', 'FETCH_HEAD:ROADMAP.md'),
  });

  rmSync(dest, { recursive: true, force: true });
  const copy = (from, to, names) => {
    mkdirSync(join(dest, to), { recursive: true });
    for (const name of names) copyFileSync(join(checkout, from, name), join(dest, to, name));
  };
  copy('config/crd/bases', 'crds', crds);
  copy('config/samples', 'samples', yamlIn('config/samples', ['kustomization.yaml']));
  mkdirSync(join(dest, 'guides'));
  copyFileSync(join(checkout, 'docs/deploy.md'), join(dest, 'guides/deploy.md'));
  copyFileSync(join(checkout, 'ARCHITECTURE.md'), join(dest, 'guides/architecture.md'));
  writeFileSync(join(dest, 'release.json'), `${JSON.stringify(release, null, 2)}\n`);

  for (const warning of warnings) {
    console.warn(process.env.GITHUB_ACTIONS ? `::warning::${warning}` : `warning: ${warning}`);
  }
  const { commit, main } = release.source;
  console.log(
    `kflare/ now holds ${tag} (${commit.slice(0, 7)}), with main's CHANGELOG.md and ROADMAP.md (${main.slice(0, 7)})`,
  );
} finally {
  rmSync(checkout, { recursive: true, force: true });
}
