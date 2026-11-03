// Copies a kflare release's CRDs, samples and guides into kflare/, which the
// docs pages are built from, so each release bump shows its API changes as a
// diff and builds never fetch anything:
//
//   npm run sync-kflare -w @site/kflare-site -- v0.5.0
//
// Then update src/content.ts to the same release (a test checks they match).
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = 'https://github.com/JonathanGraniero/kflare';
const tag = process.argv[2];
if (!/^v\d+\.\d+\.\d+$/.test(tag ?? '')) {
  console.error('usage: sync-kflare.mjs vX.Y.Z');
  process.exit(1);
}

const dest = new URL('../kflare/', import.meta.url).pathname;
const checkout = mkdtempSync(join(tmpdir(), 'kflare-'));
try {
  const clone = ['clone', '--quiet', '--depth', '1', '--branch', tag, REPO, checkout];
  execFileSync('git', ['-c', 'advice.detachedHead=false', ...clone], { stdio: 'inherit' });
  const commit = execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' });

  rmSync(dest, { recursive: true, force: true });
  const copyYaml = (from, to, skip = []) => {
    mkdirSync(join(dest, to), { recursive: true });
    for (const name of readdirSync(join(checkout, from))) {
      if (name.endsWith('.yaml') && !skip.includes(name)) {
        copyFileSync(join(checkout, from, name), join(dest, to, name));
      }
    }
  };
  copyYaml('config/crd/bases', 'crds');
  copyYaml('config/samples', 'samples', ['kustomization.yaml']);
  mkdirSync(join(dest, 'guides'), { recursive: true });
  copyFileSync(join(checkout, 'docs/deploy.md'), join(dest, 'guides/deploy.md'));
  copyFileSync(join(checkout, 'ARCHITECTURE.md'), join(dest, 'guides/architecture.md'));

  const source = { repo: REPO, tag, commit: commit.trim() };
  writeFileSync(join(dest, 'source.json'), `${JSON.stringify(source, null, 2)}\n`);
  console.log(`kflare/ now holds ${tag} (${source.commit.slice(0, 7)})`);
} finally {
  rmSync(checkout, { recursive: true, force: true });
}
