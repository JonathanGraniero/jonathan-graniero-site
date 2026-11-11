/**
 * What kflare.dev says about kflare. RELEASE is read from GitHub at build
 * time (scripts/fetch-kflare.mjs): the latest release, its kinds, and what
 * main's CHANGELOG and ROADMAP say comes next. The rest is the site's own
 * copy, which names no version.
 * In the prose below, `backticks` mark inline code (see WithCode).
 */
import release from '../kflare/release.json';
import type { Changes, KflareRelease } from './release/digest.ts';

export const RELEASE: KflareRelease = release;

const REPO = 'https://github.com/JonathanGraniero/kflare';
const VERSION = RELEASE.version;
const TAG = `${REPO}/blob/v${VERSION}`;

export const KFLARE = {
  version: VERSION,
  released: RELEASE.released,
  // Helm 3.8 turned on the OCI support that installing kflare's chart needs;
  // the chart itself says which Kubernetes it needs.
  requires: { kubernetes: RELEASE.kubernetes, helm: '3.8' },
  platforms: RELEASE.platforms.join(', '),
  license: 'MIT',
  /** The holder in LICENSE. */
  copyright: '2026 Jonathan Graniero',
  links: {
    repo: REPO,
    release: `${REPO}/releases/tag/v${VERSION}`,
    releases: `${REPO}/releases`,
    changelog: `${REPO}/blob/main/CHANGELOG.md`,
    quickstart: `${TAG}/README.md#quickstart-expose-a-service-through-a-cloudflare-tunnel`,
    roadmap: `${REPO}/blob/main/ROADMAP.md`,
    discussions: `${REPO}/discussions`,
    issues: `${REPO}/issues`,
    contributing: `${REPO}/blob/main/CONTRIBUTING.md`,
    security: `${REPO}/blob/main/SECURITY.md`,
    governance: `${REPO}/blob/main/GOVERNANCE.md`,
    conduct: `${REPO}/blob/main/CODE_OF_CONDUCT.md`,
    license: `${REPO}/blob/main/LICENSE`,
    artifactHub: 'https://artifacthub.io/packages/helm/kflare/kflare',
    scorecard: 'https://scorecard.dev/viewer/?uri=github.com/JonathanGraniero/kflare',
  },
} as const;

/** The hero's example: a hostname pointed at a tunnel, by reference (examples/expose-a-service). */
export const HERO_MANIFEST = `apiVersion: kflare.dev/v1alpha1
kind: Tunnel
metadata:
  name: hello-tunnel
spec:
  name: hello
  accountRef:
    name: my-account
  credentialsSecretRef:
    name: hello-tunnel-token
---
apiVersion: kflare.dev/v1alpha1
kind: DNSRecord
metadata:
  name: hello
spec:
  zoneRef:
    name: my-zone
  name: hello.example.com
  type: CNAME
  tunnelRef:
    name: hello-tunnel`;

export const HERO_SESSION = `$ kubectl apply -f hello.yaml
tunnel.kflare.dev/hello-tunnel created
dnsrecord.kflare.dev/hello created
$ kubectl wait --for=condition=Ready dnsrecord/hello
dnsrecord.kflare.dev/hello condition met`;

/** The README's quickstart, step by step. */
export const QUICKSTART = {
  install: `helm install kflare oci://ghcr.io/jonathangraniero/charts/kflare \\
  --version ${VERSION} --namespace kflare-system --create-namespace
kubectl -n kflare-system rollout status deployment/kflare`,
  account: `kubectl -n kflare-system create secret generic cloudflare-token \\
  --from-literal=CF_API_TOKEN=<your API token>

kubectl apply -f - <<'EOF'
apiVersion: kflare.dev/v1alpha1
kind: CloudflareAccount
metadata:
  name: my-account
spec:
  accountID: <your account ID>
  tokenSecretRef:
    name: cloudflare-token
    namespace: kflare-system
EOF`,
  expose: `curl -sSL https://raw.githubusercontent.com/JonathanGraniero/kflare/v${VERSION}/examples/expose-a-service/expose-a-service.yaml \\
  | sed 's/example\\.com/your-domain.com/g' | kubectl apply -f -

kubectl -n kflare-example wait --for=condition=Ready dnsrecords.kflare.dev/hello --timeout=5m
curl https://hello.your-domain.com`,
  /** What the quickstart's token needs, with the zone permissions limited to the domain. */
  permissions: [
    'Account · Account Settings · Read',
    'Account · Cloudflare Tunnel · Edit',
    'Zone · Zone · Read',
    'Zone · DNS · Edit',
  ],
} as const;

/**
 * Every kind in the release, as the README's "Resource kinds" table describes
 * it, with the API token permission each needs. A kind's reference page is at
 * /docs/reference/<kind in lower case>/.
 */
export const AREAS = RELEASE.areas;

export const KIND_COUNT = AREAS.reduce((n, a) => n + a.kinds.length, 0);

/** The docs pages' paths, here so the home page can link them without loading the docs. */
export const DOCS = {
  home: '/docs/',
  deploy: '/docs/deploy/',
  architecture: '/docs/architecture/',
} as const;

export const kindPath = (kind: string) => `/docs/reference/${kind.toLowerCase()}/`;

/** The annotations every kind reads, from pkg/reconciler/base.go and the chart's values. */
export const ANNOTATIONS: { name: string; values: string[]; text: string }[] = [
  {
    name: 'kflare.dev/adoption-policy',
    values: ['adopt', 'adopt-or-create'],
    text: 'Lets a resource take over a Cloudflare object kflare did not create: `adopt` uses an existing one and never creates, `adopt-or-create` creates one when there is none. Without it, a resource only creates, and reports an existing object as `AlreadyExists`.',
  },
  {
    name: 'kflare.dev/deletion-policy',
    values: ['retain', 'delete'],
    text: "What deleting the resource does to its Cloudflare object: `retain` keeps it, `delete` deletes it, even one kflare adopted. Without it, an adopted object is kept, and one kflare created follows the chart's `defaultDeletionPolicy`, which is `delete`.",
  },
  {
    name: 'kflare.dev/paused',
    values: ['"true"'],
    text: 'kflare leaves the resource alone until the annotation is removed: it makes no Cloudflare call for it, and does not finish deleting it.',
  },
];

export type IconName =
  'shield' | 'trash' | 'link' | 'check' | 'git' | 'team' | 'pause' | 'sync' | 'seal';

/** How kflare behaves. */
export const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'shield',
    title: "Never takes over what it didn't create",
    text: 'Nobody starts with an empty Cloudflare account. An existing object is used only when its resource asks, with the `kflare.dev/adoption-policy` annotation. Otherwise the resource reports `AlreadyExists` and changes nothing.',
  },
  {
    icon: 'trash',
    title: 'Deletion is deliberate',
    text: 'Deleting a resource deletes what kflare created and keeps what it adopted. `kflare.dev/deletion-policy` keeps any object, for zones and storage that must outlive a manifest.',
  },
  {
    icon: 'link',
    title: 'References, not copied IDs',
    text: 'Resources point at each other by name. A DNS record follows its tunnel when the tunnel is recreated with a new ID, and resources can be deleted in any order: parents wait for the ones that need them.',
  },
  {
    icon: 'check',
    title: 'One Ready condition says why',
    text: 'Every resource reports a single `Ready` condition with a reason, and records each change as a Kubernetes Event. `kubectl describe` names the missing Secret or the permission Cloudflare refused.',
  },
  {
    icon: 'git',
    title: 'A platform component like any other',
    text: 'Install it with Helm, Argo CD or Flux. The chart manages the CRDs and runs under the restricted Pod Security Standard, with leader election, standby replicas, a PodDisruptionBudget and metrics over HTTPS.',
  },
  {
    icon: 'team',
    title: 'Teams manage their own',
    text: 'API tokens stay in Secrets, so External Secrets Operator and Sealed Secrets work, and a rotated token is picked up straight away. Only cluster admins create accounts; the namespaced kinds join the built-in `edit` and `admin` roles.',
  },
  {
    icon: 'pause',
    title: 'Pause for an incident',
    text: 'Annotate a resource with `kflare.dev/paused: "true"` and kflare leaves its Cloudflare object alone, for an incident or a migration done by hand, until the annotation is removed.',
  },
  {
    icon: 'sync',
    title: 'Drift put back',
    text: "A change made in the Cloudflare dashboard is put back on the next reconcile. By default that can be hours away; the chart's `driftCheckInterval` checks every resource on a schedule.",
  },
  {
    icon: 'seal',
    title: 'Signed releases',
    text: 'The image and the Helm chart are signed with cosign, keyless, and the image ships with SBOMs and provenance, so an admission policy or Flux can verify them before they run.',
  },
];

/** The README's "How it's built". */
export const QUALITY: { title: string; text: string }[] = [
  {
    title: 'Live end-to-end tests',
    text: "A suite in GitHub Actions runs every resource kind against a real Cloudflare account on the Free plan, and checks Cloudflare's copy after each step. Its token holds only the permissions the deploy guide lists.",
  },
  {
    title: 'Mutation testing',
    text: 'Deliberate bugs are injected into the controllers, and the tests have to catch every one.',
  },
  {
    title: 'Fuzz tests',
    text: "On the code that reads input kflare doesn't control: the metrics endpoint's authentication and the reading of Cloudflare's errors.",
  },
  {
    title: 'Cloudflare checked first',
    text: 'What the API accepts, refuses and stores is probed live before code relies on it, and recorded in `ARCHITECTURE.md`.',
  },
  {
    title: 'Known vulnerabilities checked',
    text: "The code and the image are scanned on every pull request, and the latest release's image every week.",
  },
  {
    title: 'OpenSSF Scorecard',
    text: "The repository's security practices are scored by the Open Source Security Foundation's Scorecard.",
  },
];

/** A bullet of a roadmap card: a line of text, under its label if it has one. */
export interface RoadmapItem {
  label?: string;
  text: string;
}

/**
 * The changelog's changes, a line for each of its headings: the heading, and
 * the first change under it. The changes after the first are written to be
 * read after it and with their detail ("Or to the resources that carry some
 * labels"), so they stay in the changelog. Changes under no heading are each
 * a line.
 */
export function headlines(changes: Changes[]): RoadmapItem[] {
  return changes.flatMap(({ heading, items }) =>
    heading ? [{ label: heading, text: items[0]! }] : items.map((text) => ({ text })),
  );
}

/** What main's CHANGELOG.md lists since the release: merged, not yet released. */
export const NEXT_RELEASE = headlines(RELEASE.next);

/** ROADMAP.md's "Next": candidates a Free account can use and test. */
export const ROADMAP = RELEASE.roadmap;
