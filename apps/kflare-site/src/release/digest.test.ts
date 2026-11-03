import { describe, expect, it } from 'vitest';
import { RELEASE } from '../content.ts';
import {
  changesSince,
  chartFacts,
  digest,
  doneAreas,
  resourceKinds,
  roadmapNext,
  type Source,
} from './digest.ts';

const README = `# kflare

## Quickstart

- Account · Account Settings · Read

## Resource kinds

| Kind | What it manages | Token permission | Sample |
|---|---|---|---|
| \`Zone\` | A zone, created or adopted | Zone · Zone · Edit (Read to adopt) | [zone](z.yaml) |
| \`DNSRecord\` | A DNS record, or with \`tunnelRef\` a hostname pointed at a \`Tunnel\` | Zone · DNS · Edit | [A](a.yaml), [MX](mx.yaml) |
| \`Tunnel\` | A Cloudflare Tunnel | Account · Cloudflare Tunnel · Edit | [tunnel](t.yaml) |

Grant a token only the permissions of the kinds you use.
`;

const ROADMAP = `# Roadmap

## Done

| Area | Resource kinds |
|---|---|
| DNS | \`Zone\`, \`DNSRecord\` |
| Tunnels | \`Tunnel\`, \`TunnelConfiguration\` |
| Rules (the products that replace Page Rules) | \`CacheRule\` |

Each is tested live.

## Next

Candidates that a Free account can use and test:

- **Zone settings**: the SSL mode and HSTS
- **Workers custom domains**, next to \`WorkerRoute\`

For running kflare:

- **A token's expiry** ([#74](https://github.com/JonathanGraniero/kflare/issues/74))

## Waiting on something
`;

const CHANGELOG = `# Changelog

kflare follows semantic versioning.

## Unreleased

### Upgrading

**kflare now paces its calls.** Set the chart's \`cloudflareRateLimit\`.

- **An upgrade step**, not a change

### The controller

- **kflare keeps to Cloudflare's API rate limit.** All of a token's calls share one budget
  ([#73](https://github.com/JonathanGraniero/kflare/issues/73))
- Two metrics: \`kflare_a\` and \`kflare_b\`, by account
- **A failure now gives Cloudflare's \`cf-ray\` ID,** which support asks for
  - **A nested entry** adds detail

### GitOps

- **Health checks for Argo CD and Flux.** Argo CD judged no kflare resource

## v0.5.0 (alpha)

- **Tagged, not yet published.**

### The controller

- **A change in v0.5.0.**

### Known limitations

- **Drift is corrected late.**

### Development

- **A new make target.**

## v0.4.1 (alpha)

### The controller

- **Already released.**
`;

const CHART = `apiVersion: v2
name: kflare
version: 0.4.1
kubeVersion: ">=1.34.0-0"
annotations:
  artifacthub.io/images: |
    - image: ghcr.io/jonathangraniero/kflare:0.4.1
      name: kflare
      platforms:
      - linux/amd64
      - linux/arm64
`;

const crd = (kind: string, description: string) => `apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
spec:
  names:
    kind: ${kind}
  versions:
    - name: v1alpha1
      schema:
        openAPIV3Schema:
          description: ${JSON.stringify(description)}
`;

const SOURCE: Source = {
  repo: 'https://github.com/JonathanGraniero/kflare',
  tag: 'v0.4.1',
  commit: 'c'.repeat(40),
  publishedAt: '2026-11-01T00:19:09Z',
  main: 'm'.repeat(40),
  changelog: 'l'.repeat(40),
  roadmap: 'r'.repeat(40),
};

describe('resourceKinds', () => {
  it("reads each kind's description and permission from the README's table", () => {
    const kinds = resourceKinds(README);
    expect([...kinds.keys()]).toEqual(['Zone', 'DNSRecord', 'Tunnel']);
    expect(kinds.get('DNSRecord')).toEqual({
      does: 'A DNS record, or with `tunnelRef` a hostname pointed at a `Tunnel`',
      permission: 'Zone · DNS · Edit',
    });
  });

  it('says what changed when the table is gone, or its columns are', () => {
    expect(() => resourceKinds('# kflare\n\n## Resource kinds\n\nNone.\n')).toThrow(
      'README.md has no table under "Resource kinds"',
    );
    expect(() => resourceKinds(README.replace('Token permission', 'Permission'))).toThrow(
      '"Resource kinds" table has the columns Kind, What it manages, Permission, Sample',
    );
  });
});

describe('the roadmap', () => {
  it("reads each area's kinds from the Done table", () => {
    expect(doneAreas(ROADMAP)).toEqual([
      { area: 'DNS', kinds: ['Zone', 'DNSRecord'] },
      { area: 'Tunnels', kinds: ['Tunnel', 'TunnelConfiguration'] },
      { area: 'Rules', kinds: ['CacheRule'] },
    ]);
  });

  it("lists Next's first list, as plain text with inline code", () => {
    expect(roadmapNext(ROADMAP)).toEqual([
      'Zone settings: the SSL mode and HSTS',
      'Workers custom domains, next to `WorkerRoute`',
    ]);
  });

  it('says what changed when a section is gone', () => {
    expect(() => doneAreas('# Roadmap\n\n## Next\n\n- **A**\n')).toThrow('no table under "Done"');
    expect(() => roadmapNext('# Roadmap\n\n## Next\n\nNothing.\n')).toThrow('no list under "Next"');
  });
});

describe('changesSince', () => {
  it("lists each change's bold lead above the release, by heading", () => {
    expect(changesSince(CHANGELOG, '0.4.1')).toEqual([
      {
        heading: 'The controller',
        items: [
          "kflare keeps to Cloudflare's API rate limit",
          "A failure now gives Cloudflare's `cf-ray` ID",
          'A change in v0.5.0',
        ],
      },
      { heading: 'GitOps', items: ['Health checks for Argo CD and Flux'] },
      { items: ['Tagged, not yet published'] },
    ]);
  });

  it('stops at the release, which is not v0.4.10 for v0.4.1', () => {
    expect(changesSince(CHANGELOG, '0.5.0').flatMap((g) => g.items)).not.toContain(
      'A change in v0.5.0',
    );
    const ten = `## v0.4.10 (alpha)\n\n- **Ten.**\n\n## v0.4.1 (alpha)\n\n- **One.**\n`;
    expect(changesSince(ten, '0.4.1')).toEqual([{ items: ['Ten'] }]);
    expect(changesSince(ten, '0.4.10')).toEqual([]);
  });

  it('lists nothing right after a release, and says when the release is missing', () => {
    expect(changesSince('# Changelog\n\n## v0.4.1 (alpha)\n\n- **One.**\n', '0.4.1')).toEqual([]);
    expect(() => changesSince(CHANGELOG, '0.6.0')).toThrow(
      'CHANGELOG.md has no section for v0.6.0',
    );
  });
});

describe('chartFacts', () => {
  it("reads the chart's oldest Kubernetes and the image's platforms", () => {
    expect(chartFacts(CHART)).toEqual({ kubernetes: '1.34', platforms: ['amd64', 'arm64'] });
  });

  it('says what is missing', () => {
    expect(() => chartFacts('name: kflare\n')).toThrow("Chart.yaml's kubeVersion names no version");
    expect(() => chartFacts('kubeVersion: ">=1.34.0-0"\n')).toThrow('lists no platforms');
  });
});

describe('digest', () => {
  const sources = {
    source: SOURCE,
    readme: README,
    chart: CHART,
    crds: [
      crd('DNSRecord', 'DNSRecord represents a DNS record.'),
      crd('IPList', 'IPList is the Schema for the iplists API. It manages a custom IP list. More.'),
      crd('Tunnel', 'Tunnel represents a Cloudflare Tunnel.'),
      crd('Zone', 'Zone represents a DNS zone.'),
    ],
    changelog: CHANGELOG,
    roadmap: ROADMAP,
  };

  it("lists the release's kinds in the roadmap's areas, and what comes next", () => {
    const { release, warnings } = digest(sources);
    expect(release).toEqual({
      source: SOURCE,
      version: '0.4.1',
      // In UTC, as GitHub dates it.
      released: 'November 1, 2026',
      kubernetes: '1.34',
      platforms: ['amd64', 'arm64'],
      areas: [
        {
          area: 'DNS',
          kinds: [
            {
              kind: 'Zone',
              does: 'A zone, created or adopted',
              permission: 'Zone · Zone · Edit (Read to adopt)',
            },
            {
              kind: 'DNSRecord',
              does: 'A DNS record, or with `tunnelRef` a hostname pointed at a `Tunnel`',
              permission: 'Zone · DNS · Edit',
            },
          ],
        },
        {
          area: 'Tunnels',
          kinds: [
            {
              kind: 'Tunnel',
              does: 'A Cloudflare Tunnel',
              permission: 'Account · Cloudflare Tunnel · Edit',
            },
          ],
        },
        // Not in the README or the Done table: listed anyway, from its CRD.
        { area: 'Other', kinds: [{ kind: 'IPList', does: 'IPList manages a custom IP list' }] },
      ],
      next: changesSince(CHANGELOG, '0.4.1'),
      roadmap: roadmapNext(ROADMAP),
    });
    expect(warnings).toEqual([
      'IPList is in no area of ROADMAP.md\'s "Done" table: listed under "Other"',
      'IPList has no row in README.md\'s "Resource kinds" table: described from its CRD',
    ]);
  });
});

describe('the release in kflare/release.json', () => {
  const texts = [
    ...RELEASE.areas.flatMap((a) => [a.area, ...a.kinds.flatMap((k) => [k.kind, k.does])]),
    ...RELEASE.next.flatMap((g) => [g.heading ?? 'none', ...g.items]),
    ...RELEASE.roadmap,
  ];

  it('is the release it names', () => {
    expect(RELEASE.source.tag).toBe(`v${RELEASE.version}`);
    expect(RELEASE.released).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    expect(RELEASE.areas.every((a) => a.kinds.length > 0)).toBe(true);
  });

  it('holds plain text, with whole inline code spans', () => {
    for (const text of texts) {
      expect(text, text).toMatch(/\S/);
      expect(text, text).not.toMatch(/\*\*|\]\(|<\/?[a-z]/);
      expect(text.split('`').length % 2, text).toBe(1);
    }
  });
});
