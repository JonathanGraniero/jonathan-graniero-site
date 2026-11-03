/**
 * What kflare.dev shows of kflare, read from GitHub at build time:
 * scripts/fetch-kflare.mjs passes the latest release's README, chart and
 * CRDs and main's CHANGELOG and ROADMAP to digest(), and writes what it
 * returns to kflare/release.json, which the site imports. This runs in Node
 * with its types stripped, so it uses only erasable TypeScript.
 */
import type { ListItem } from 'mdast';
import { parse } from 'yaml';
import { crdSummary } from '../docs/schema.ts';
import {
  headingText,
  inlineText,
  itemText,
  parseMarkdown,
  section,
  tableRows,
} from './markdown.ts';

/** What the site was built from, published as /source.json for .github/workflows/watch-kflare.yml. */
export interface Source {
  repo: string;
  /** The latest published release, and the commit it tags. */
  tag: string;
  commit: string;
  publishedAt: string;
  /** The commit of main that was read, and the blobs of its CHANGELOG.md and ROADMAP.md. */
  main: string;
  changelog: string;
  roadmap: string;
}

export interface Kind {
  kind: string;
  /** What it manages, in the README's words; `backticks` mark inline code. */
  does: string;
  /** The API token permission it needs; unknown for a kind the README doesn't list. */
  permission?: string;
}

export interface Area {
  area: string;
  kinds: Kind[];
}

/** Changes listed under one heading of the changelog, such as "The controller". */
export interface Changes {
  heading?: string;
  items: string[];
}

export interface KflareRelease {
  source: Source;
  /** 0.4.1, for the tag v0.4.1. */
  version: string;
  /** When the release was published: November 1, 2026. */
  released: string;
  /** The oldest Kubernetes minor the chart installs on: 1.34. */
  kubernetes: string;
  /** The image's architectures: amd64, arm64. */
  platforms: string[];
  /** Every kind with a CRD in the release, in the areas of ROADMAP.md's Done table. */
  areas: Area[];
  /** Merged and not yet released: CHANGELOG.md's changes since the release. */
  next: Changes[];
  /** ROADMAP.md's "Next". */
  roadmap: string[];
}

export interface Sources {
  source: Source;
  /** README.md, helm/kflare/Chart.yaml and config/crd/bases/*.yaml, at the release's tag. */
  readme: string;
  chart: string;
  crds: string[];
  /** CHANGELOG.md and ROADMAP.md on main. */
  changelog: string;
  roadmap: string;
}

/** Where a kind goes when ROADMAP.md's Done table has no area for it. */
export const OTHER_AREA = 'Other';

/** README.md's "Resource kinds" table: what each kind manages, and the permission its token needs. */
export function resourceKinds(readme: string): Map<string, Omit<Kind, 'kind'>> {
  const table = section(parseMarkdown(readme), 'Resource kinds')?.find((n) => n.type === 'table');
  if (!table) throw new Error('README.md has no table under "Resource kinds"');
  const columns = ['Kind', 'What it manages', 'Token permission'];
  const rows = tableRows(table, columns, 'README.md\'s "Resource kinds" table');
  return new Map(
    rows.map(([kind = '', does = '', permission = '']) => [
      kind.replace(/`/g, ''),
      { does, permission },
    ]),
  );
}

/** ROADMAP.md's "Done" table: each area, and the kinds in it. */
export function doneAreas(roadmap: string): { area: string; kinds: string[] }[] {
  const table = section(parseMarkdown(roadmap), 'Done')?.find((n) => n.type === 'table');
  if (!table) throw new Error('ROADMAP.md has no table under "Done"');
  const rows = tableRows(table, ['Area', 'Resource kinds'], 'ROADMAP.md\'s "Done" table');
  return rows.map(([area = '', kinds = '']) => ({
    // "Rules (the products that replace Page Rules)" is Rules.
    area: area.replace(/\s*\(.*\)$/, ''),
    kinds: [...kinds.matchAll(/`([^`]+)`/g)].map((m) => m[1]!),
  }));
}

/** ROADMAP.md's "Next": its first list, of what a Free account can use and test. */
export function roadmapNext(roadmap: string): string[] {
  const list = section(parseMarkdown(roadmap), 'Next')?.find((n) => n.type === 'list');
  if (!list) throw new Error('ROADMAP.md has no list under "Next"');
  return list.children.map(itemText);
}

/** Changelog headings with nothing new under them: how to upgrade, what doesn't work yet, internals. */
const NOT_CHANGES = /^(Upgrading|Known limitations|Development)\b/;

/**
 * CHANGELOG.md's changes since a release, from the sections above the
 * release's own: Unreleased, and a release tagged but not yet published. Each
 * change is the bold sentence its entry opens with; an entry without one
 * adds detail to the one before. They are grouped by the headings above them.
 */
export function changesSince(changelog: string, version: string): Changes[] {
  const blocks = parseMarkdown(changelog).children;
  const end = blocks.findIndex(
    (n) => n.type === 'heading' && n.depth === 2 && headingText(n).split(' ')[0] === `v${version}`,
  );
  if (end < 0) throw new Error(`CHANGELOG.md has no section for v${version}`);

  const groups = new Map<string, string[]>();
  let under = '';
  let listing = false;
  for (const block of blocks.slice(0, end)) {
    if (block.type === 'heading') {
      under = block.depth > 2 ? headingText(block) : '';
      listing = block.depth > 1 && !NOT_CHANGES.test(under);
    } else if (block.type === 'list' && listing) {
      const leads = block.children.map(boldLead).filter((lead) => lead !== undefined);
      if (leads.length) groups.set(under, [...(groups.get(under) ?? []), ...leads]);
    }
  }
  return [...groups].map(([heading, items]) => (heading ? { heading, items } : { items }));
}

function boldLead(item: ListItem): string | undefined {
  const [first] = item.children;
  const [lead] = first?.type === 'paragraph' ? first.children : [];
  return lead?.type === 'strong' ? inlineText(lead.children).replace(/[.,:;]$/, '') : undefined;
}

/** From the release's Chart.yaml: the oldest Kubernetes it installs on, and the image's platforms. */
export function chartFacts(chart: string): { kubernetes: string; platforms: string[] } {
  const { kubeVersion = '', annotations = {} } = (parse(chart) ?? {}) as {
    kubeVersion?: string;
    annotations?: Record<string, string>;
  };
  // ">=1.34.0-0" is 1.34.
  const kubernetes = /\d+\.\d+/.exec(kubeVersion)?.[0];
  if (!kubernetes) throw new Error(`Chart.yaml's kubeVersion names no version: "${kubeVersion}"`);
  // Artifact Hub's annotation, which `make helm` writes from the image.
  const images = (parse(annotations['artifacthub.io/images'] ?? '') ?? []) as {
    platforms?: string[];
  }[];
  const platforms = images.flatMap((i) => i.platforms ?? []).map((p) => p.replace(/^linux\//, ''));
  if (!platforms.length) throw new Error('Chart.yaml lists no platforms in artifacthub.io/images');
  return { kubernetes, platforms: [...new Set(platforms)] };
}

interface Crd {
  spec: {
    names: { kind: string };
    versions: { schema: { openAPIV3Schema: { description?: string } } }[];
  };
}

/**
 * The release's kinds, its CRDs, in ROADMAP.md's areas and order, described
 * by the README. A kind missing from either is still listed, and a warning
 * says what to add.
 */
function areas(s: Sources, warn: (message: string) => void): Area[] {
  const described = resourceKinds(s.readme);
  const describe = (kind: string, summary: string): Kind => {
    const row = described.get(kind);
    if (row) return { kind, ...row };
    warn(`${kind} has no row in README.md's "Resource kinds" table: described from its CRD`);
    return { kind, does: summary.split(/(?<=\.)\s/)[0]!.replace(/\.$/, '') };
  };

  const unplaced = new Map(
    s.crds.map((text) => {
      const { names, versions } = (parse(text) as Crd).spec;
      const summary = crdSummary(names.kind, versions[0]?.schema.openAPIV3Schema.description);
      return [names.kind, summary];
    }),
  );
  const byArea = new Map<string, Kind[]>();
  const add = (area: string, kind: Kind) => byArea.set(area, [...(byArea.get(area) ?? []), kind]);
  for (const { area, kinds } of doneAreas(s.roadmap)) {
    for (const kind of kinds) {
      const summary = unplaced.get(kind);
      // Kinds merged since the release are in the table too.
      if (summary === undefined) continue;
      unplaced.delete(kind);
      add(area, describe(kind, summary));
    }
  }
  for (const [kind, summary] of unplaced) {
    warn(`${kind} is in no area of ROADMAP.md's "Done" table: listed under "${OTHER_AREA}"`);
    add(OTHER_AREA, describe(kind, summary));
  }
  return [...byArea].map(([area, kinds]) => ({ area, kinds }));
}

const DATE = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

/** Everything the site shows of a release; `warnings` name gaps in kflare's docs. */
export function digest(s: Sources): { release: KflareRelease; warnings: string[] } {
  const warnings: string[] = [];
  const version = s.source.tag.replace(/^v/, '');
  const release: KflareRelease = {
    source: s.source,
    version,
    released: DATE.format(new Date(s.source.publishedAt)),
    ...chartFacts(s.chart),
    areas: areas(s, (message) => warnings.push(message)),
    next: changesSince(s.changelog, version),
    roadmap: roadmapNext(s.roadmap),
  };
  return { release, warnings };
}
