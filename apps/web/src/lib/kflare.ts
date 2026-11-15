/**
 * Facts for the kflare case study (/projects/kflare) and the home-page
 * spotlight. The release's version, date, Kubernetes minor, platforms and
 * kinds come from kflare.dev's copy of kflare's latest GitHub release
 * (apps/kflare-site/scripts/fetch-kflare.mjs, which the web build runs when
 * it has none), so a kflare release needs no edits here: watch-kflare.yml
 * redeploys the site when the release changes. The rest names no version.
 */
import release from '../../../kflare-site/kflare/release.json';

/** The parts of kflare-site's KflareRelease (src/release/digest.ts) read here. */
interface Release {
  source: { tag: string; publishedAt: string };
  version: string;
  kubernetes: string;
  platforms: string[];
  areas: { area: string; kinds: { kind: string }[] }[];
}

const RELEASE: Release = release;

/** Kinds written by hand; kflare-gen generates the rest. */
const HAND_WRITTEN: readonly string[] = ['CloudflareAccount'];

const REPO = 'https://github.com/JonathanGraniero/kflare';
const VERSION = RELEASE.version;
const TAG = `${REPO}/blob/v${VERSION}`;
const AREAS = RELEASE.areas.map(({ area, kinds }) => ({ area, kinds: kinds.map((k) => k.kind) }));

export const KFLARE = {
  path: '/projects/kflare',
  version: VERSION,
  /** The day the release was published, in UTC: 2026-11-11. */
  released: RELEASE.source.publishedAt.slice(0, 10),
  started: '2026-03',
  apiVersion: 'kflare.dev/v1alpha1',
  // Helm 3.8 turned on the OCI support installing the chart needs.
  requires: `Kubernetes ${RELEASE.kubernetes}+, Helm 3.8+`,
  platforms: RELEASE.platforms.map((p) => `linux/${p}`),
  license: 'MIT',
  links: {
    repo: REPO,
    site: 'https://kflare.dev',
    docs: 'https://kflare.dev/docs/',
    artifactHub: 'https://artifacthub.io/packages/helm/kflare/kflare',
    release: `${REPO}/releases/tag/v${VERSION}`,
    quickstart: `${TAG}/README.md#quickstart-expose-a-service-through-a-cloudflare-tunnel`,
    deploy: `${TAG}/docs/deploy.md`,
    architecture: `${TAG}/ARCHITECTURE.md`,
    roadmap: `${REPO}/blob/main/ROADMAP.md`,
    discussions: `${REPO}/discussions`,
    issues: `${REPO}/issues`,
  },
  post: '/blog/building-kflare-kubernetes-operator-for-cloudflare',
  install: `helm install kflare oci://ghcr.io/jonathangraniero/charts/kflare \\
  --version ${VERSION} --namespace kflare-system --create-namespace`,
  /** From examples/expose-a-service: a hostname pointed at a Tunnel, by reference. */
  example: `apiVersion: kflare.dev/v1alpha1
kind: DNSRecord
metadata:
  name: hello
  namespace: kflare-example
spec:
  zoneRef:
    name: my-zone
  name: hello.example.com
  type: CNAME
  tunnelRef:
    name: hello-tunnel`,
  areas: AREAS,
  /**
   * Kinds kflare-gen generates (types, controller glue and envtest specs) from
   * cloudflare-go v7 and Cloudflare's OpenAPI spec: every kind but the
   * hand-written ones, since v0.4.0.
   */
  generated: AREAS.flatMap((a) => a.kinds).filter((kind) => !HAND_WRITTEN.includes(kind)),
} as const;

export const KFLARE_KIND_COUNT = KFLARE.areas.reduce((n, a) => n + a.kinds.length, 0);

/** Projects that have their own page, keyed by project name. */
export const CASE_STUDIES: Record<string, string> = { kflare: KFLARE.path };
