import { parse, parseAllDocuments } from 'yaml';
import { AREAS, RELEASE, kindPath } from '../content.ts';
import type { Kind } from '../release/digest.ts';
import {
  annotatedExample,
  crdSummary,
  flatten,
  ownRules,
  type Field,
  type Schema,
} from './schema.ts';

// The kflare release in kflare/, fetched from GitHub by
// scripts/fetch-kflare.mjs. Only the pre-render reads it: docs pages are
// static HTML, never hydrated, so none of this reaches the browser.
const raw = (files: Record<string, string>) =>
  Object.entries(files).map(([path, text]) => ({
    file: path.slice(path.lastIndexOf('/') + 1),
    text,
  }));

const CRDS = raw(
  import.meta.glob<string>('../../kflare/crds/*.yaml', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
);
const SAMPLE_FILES = raw(
  import.meta.glob<string>('../../kflare/samples/*.yaml', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
);
const GUIDE_FILES = raw(
  import.meta.glob<string>('../../kflare/guides/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
);

export const SOURCE = RELEASE.source;

export { kindPath };

/** A file in the kflare repository, at the release the docs describe. */
export function repoUrl(path: string, hash = ''): string {
  const directory = !/\.[a-z0-9]+$/i.test(path);
  return `${SOURCE.repo}/${directory ? 'tree' : 'blob'}/${SOURCE.tag}/${path}${hash}`;
}

export function guideSource(name: 'deploy' | 'architecture'): string {
  const guide = GUIDE_FILES.find((f) => f.file === `${name}.md`);
  if (!guide) throw new Error(`kflare/guides/${name}.md is missing: run scripts/fetch-kflare.mjs`);
  return guide.text;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const SAMPLES = SAMPLE_FILES.map(({ file, text }) => ({
  file,
  text,
  docs: parseAllDocuments(text)
    .map((d) => d.toJS() as unknown)
    .filter(isObj),
}));

export interface Column {
  name: string;
  type: string;
  jsonPath: string;
  description?: string;
}

export interface KindDoc extends Kind {
  /** Its page: /docs/reference/<slug>/. */
  slug: string;
  area: string;
  apiVersion: string;
  scope: string;
  plural: string;
  shortNames: string[];
  summary: string;
  spec: Field[];
  /** Rules on spec as a whole, by their messages. */
  rules: string[];
  status: Field[];
  columns: Column[];
  example: string;
  samples: { file: string; text: string; url: string }[];
}

interface Crd {
  spec: {
    group: string;
    scope: string;
    names: { kind: string; plural: string; shortNames?: string[] };
    versions: {
      name: string;
      additionalPrinterColumns?: Column[];
      schema: { openAPIV3Schema: Schema };
    }[];
  };
}

function kindDoc(crd: Crd, area: string, { does, permission }: Kind): KindDoc {
  const { group, scope, names, versions } = crd.spec;
  const [version] = versions;
  if (!version) throw new Error(`${names.kind} has no version`);
  const root = version.schema.openAPIV3Schema;
  const spec = root.properties?.spec ?? {};
  const status = root.properties?.status ?? {};

  const samples = SAMPLES.filter((s) => s.docs.some((d) => d.kind === names.kind));
  const main =
    samples.find((s) => s.file === `cloudflare_v1alpha1_${names.kind.toLowerCase()}.yaml`) ??
    samples[0];
  const docs = samples.flatMap((s) => s.docs.filter((d) => d.kind === names.kind));
  const base = main?.docs.find((d) => d.kind === names.kind);
  if (!base) throw new Error(`${names.kind} has no sample in kflare/samples`);

  return {
    kind: names.kind,
    slug: names.kind.toLowerCase(),
    area,
    does,
    permission,
    apiVersion: `${group}/${version.name}`,
    scope,
    plural: names.plural,
    shortNames: names.shortNames ?? [],
    summary: crdSummary(names.kind, root.description),
    spec: flatten(spec),
    rules: ownRules(spec),
    // A condition's own fields are Kubernetes' standard ones.
    status: flatten(status).filter((f) => !f.path.startsWith('conditions[].')),
    columns: version.additionalPrinterColumns ?? [],
    example: annotatedExample(
      base,
      docs.filter((d) => d !== base),
      spec,
    ),
    samples: samples.map(({ file, text }) => ({
      file,
      text: text.trimEnd(),
      url: repoUrl(`config/samples/${file}`),
    })),
  };
}

// AREAS comes from these same CRDs (src/release/digest.ts), so they agree
// unless kflare/ was fetched in part.
function load(): KindDoc[] {
  const crds = CRDS.map(({ text }) => parse(text) as Crd);
  const listed = AREAS.flatMap((a) => a.kinds.map((k) => k.kind));
  const extra = crds.map((c) => c.spec.names.kind).filter((k) => !listed.includes(k));
  if (extra.length) throw new Error(`kinds missing from kflare/release.json: ${extra.join(', ')}`);
  return AREAS.flatMap(({ area, kinds }) =>
    kinds.map((kind) => {
      const crd = crds.find((c) => c.spec.names.kind === kind.kind);
      if (!crd)
        throw new Error(`${kind.kind} is in kflare/release.json but kflare/crds has no CRD`);
      return kindDoc(crd, area, kind);
    }),
  );
}

/** Every kind, in the order of AREAS. */
export const KINDS: KindDoc[] = load();

/** The kind whose reference page shows a sample file, by the file's name. */
export function sampleKind(file: string): KindDoc | undefined {
  return KINDS.find((k) => k.samples.some((s) => s.file === file));
}
