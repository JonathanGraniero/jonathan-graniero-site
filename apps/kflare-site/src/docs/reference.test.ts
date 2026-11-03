import { parse, parseAllDocuments } from 'yaml';
import { describe, expect, it } from 'vitest';
import { AREAS, KFLARE } from '../content.ts';
import { guideLink } from './links.ts';
import { KINDS, SOURCE } from './reference.ts';

const uncomment = (yaml: string) => yaml.replace(/^(\s*)# /gm, '$1');

function paths(value: unknown, prefix = '', out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => paths(v, `${prefix}[]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${k}` : k;
      out.add(path);
      paths(v, path, out);
    }
  }
  return out;
}

describe('the vendored kflare release', () => {
  it('is the release content.ts describes', () => {
    expect(SOURCE.tag).toBe(`v${KFLARE.version}`);
  });

  it('documents every kind in content.ts, in its order', () => {
    expect(KINDS.map((k) => k.kind)).toEqual(AREAS.flatMap((a) => a.kinds.map((k) => k.kind)));
  });
});

describe.each(KINDS.map((k) => [k.kind, k] as const))('%s', (_, doc) => {
  it('has an example that applies as its main sample, and shows every field', () => {
    const main = doc.samples.find((s) => s.file === `cloudflare_v1alpha1_${doc.slug}.yaml`);
    const sample = parseAllDocuments(main?.text ?? doc.samples[0]!.text)
      .map((d) => d.toJS())
      .find((d) => d?.kind === doc.kind);
    expect(parse(doc.example)).toEqual(sample);

    const shown = paths(parse(uncomment(doc.example)).spec);
    const free = doc.spec.filter((f) => f.type === 'object (any fields)').map((f) => `${f.path}.`);
    for (const f of doc.spec) {
      if (free.some((p) => f.path.startsWith(p)) || f.path.includes('<key>')) continue;
      expect(shown, f.path).toContain(f.path);
    }
  });

  it('describes every field, and says what the kind is', () => {
    expect(doc.spec.length).toBeGreaterThan(0);
    for (const f of [...doc.spec, ...doc.status]) expect(f.description, f.path).not.toBe('');
    expect(doc.summary).not.toMatch(/is the Schema for/);
    expect(doc.summary.startsWith(`${doc.kind} `), doc.summary).toBe(true);
    expect(doc.summary.length).toBeGreaterThan(20);
  });
});

describe('guideLink', () => {
  const tree = `${SOURCE.repo}/tree/${SOURCE.tag}`;
  const blob = `${SOURCE.repo}/blob/${SOURCE.tag}`;

  it('keeps links between the guides, and their anchors, on the site', () => {
    expect(guideLink('../ARCHITECTURE.md#deletion', 'docs/deploy.md')).toEqual({
      href: '/docs/architecture/#deletion',
      external: false,
    });
    expect(guideLink('docs/deploy.md#monitoring', 'ARCHITECTURE.md').href).toBe(
      '/docs/deploy/#monitoring',
    );
    expect(guideLink('#upgrading', 'docs/deploy.md')).toEqual({
      href: '#upgrading',
      external: false,
    });
  });

  it("sends a sample to its kind's reference page", () => {
    expect(guideLink('../config/samples/cloudflare_v1alpha1_zone.yaml', 'docs/deploy.md')).toEqual({
      href: '/docs/reference/zone/#samples',
      external: false,
    });
  });

  it('opens anything else in the repository on GitHub, at the release', () => {
    expect(guideLink('../helm/kflare/values.yaml', 'docs/deploy.md')).toEqual({
      href: `${blob}/helm/kflare/values.yaml`,
      external: true,
    });
    expect(guideLink('../examples/expose-a-service', 'docs/deploy.md').href).toBe(
      `${tree}/examples/expose-a-service`,
    );
    expect(guideLink('./ROADMAP.md', 'ARCHITECTURE.md').href).toBe(`${blob}/ROADMAP.md`);
    expect(guideLink('https://helm.sh/', 'docs/deploy.md')).toEqual({
      href: 'https://helm.sh/',
      external: true,
    });
  });
});
