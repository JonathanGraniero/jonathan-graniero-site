/**
 * Facts about kflare shown on kflare.dev, from the v0.4.1 release: its README,
 * ROADMAP and CHANGELOG. Update them with each release; keep them true.
 * In the prose below, `backticks` mark inline code (see WithCode).
 */
const REPO = 'https://github.com/JonathanGraniero/kflare';
const VERSION = '0.4.1';
const TAG = `${REPO}/blob/v${VERSION}`;

export const KFLARE = {
  version: VERSION,
  released: 'November 1, 2026',
  requires: { kubernetes: '1.34', helm: '3.8' },
  platforms: 'amd64, arm64',
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

export interface Area {
  area: string;
  kinds: { kind: string; does: string; permission: string }[];
}

/**
 * Every kind in v0.4.1, as the README's "Resource kinds" table describes it,
 * with the API token permission each needs. A kind's reference page is at
 * /docs/reference/<kind in lower case>/.
 */
export const AREAS: Area[] = [
  {
    area: 'Accounts',
    kinds: [
      {
        kind: 'CloudflareAccount',
        does: 'The credentials every other resource uses, cluster-scoped',
        permission: 'Account · Account Settings · Read',
      },
    ],
  },
  {
    area: 'DNS',
    kinds: [
      {
        kind: 'Zone',
        does: 'A zone, created or adopted, with its name servers and status',
        permission: 'Zone · Zone · Edit (Read to adopt)',
      },
      {
        kind: 'DNSRecord',
        does: 'A DNS record, or a hostname pointed at a Tunnel',
        permission: 'Zone · DNS · Edit',
      },
    ],
  },
  {
    area: 'Tunnels',
    kinds: [
      {
        kind: 'Tunnel',
        does: 'A Cloudflare Tunnel, its token written to a Secret for `cloudflared`',
        permission: 'Account · Cloudflare Tunnel · Edit',
      },
      {
        kind: 'TunnelConfiguration',
        does: "A tunnel's routes, from hostname to Service",
        permission: 'Account · Cloudflare Tunnel · Edit',
      },
    ],
  },
  {
    area: 'Workers and storage',
    kinds: [
      {
        kind: 'WorkerScript',
        does: 'A Worker, from inline code or a ConfigMap, with its bindings',
        permission: 'Account · Workers Scripts · Edit',
      },
      {
        kind: 'WorkerRoute',
        does: 'A route from a URL pattern to a Worker',
        permission: 'Zone · Workers Routes · Edit',
      },
      {
        kind: 'KVNamespace',
        does: 'A Workers KV namespace',
        permission: 'Account · Workers KV Storage · Edit',
      },
      {
        kind: 'R2Bucket',
        does: 'An R2 bucket; kflare never deletes its objects',
        permission: 'Account · Workers R2 Storage · Edit',
      },
      { kind: 'D1Database', does: 'A D1 database', permission: 'Account · D1 · Edit' },
    ],
  },
  {
    area: 'Security',
    kinds: [
      {
        kind: 'WAFCustomRule',
        does: 'One WAF custom rule in a zone',
        permission: 'Zone · Zone WAF · Edit',
      },
      {
        kind: 'RateLimitRule',
        does: 'One rate limiting rule in a zone',
        permission: 'Zone · Zone WAF · Edit',
      },
      {
        kind: 'ManagedRuleset',
        does: 'A managed ruleset deployed to a zone, with overrides',
        permission: 'Zone · Zone WAF · Edit',
      },
      {
        kind: 'IPList',
        does: 'An IP list that rule expressions use as `$name`',
        permission: 'Account · Account Rule Lists · Edit',
      },
    ],
  },
  {
    area: 'Rules',
    kinds: [
      {
        kind: 'TransformRule',
        does: 'One URL rewrite or header transform rule',
        permission: 'Zone · Transform Rules · Edit',
      },
      {
        kind: 'RedirectRule',
        does: 'One single redirect',
        permission: 'Zone · Single Redirect · Edit',
      },
      { kind: 'CacheRule', does: 'One cache rule', permission: 'Zone · Cache Rules · Edit' },
      {
        kind: 'ConfigurationRule',
        does: 'One configuration rule: SSL mode, security level and more',
        permission: 'Zone · Config Rules · Edit',
      },
      {
        kind: 'OriginRule',
        does: "One origin rule: the origin's destination port",
        permission: 'Zone · Origin Rules · Edit',
      },
    ],
  },
  {
    area: 'Zone settings',
    kinds: [
      {
        kind: 'ManagedTransform',
        does: "A zone's managed transforms, the headers Cloudflare adds or removes",
        permission: 'Zone · Managed Headers · Edit',
      },
    ],
  },
];

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

/** How kflare behaves, all in v0.4.1. */
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

/** CHANGELOG.md's "Unreleased" section: merged, not yet in a release. */
export const NEXT_RELEASE = [
  "Each API token kept within Cloudflare's rate limit, so an account past its limit holds up no other",
  'Accounts that limit which namespaces may use them',
  'Health checks for Argo CD and Flux, so an application turns Degraded when Cloudflare refuses a resource',
  "kflare's own metrics: calls to Cloudflare, readiness and drift, with the cf-ray ID of each failure",
];

/** ROADMAP.md's "Next": candidates a Free account can use and test. */
export const ROADMAP = [
  'Zone settings: SSL mode, Always Use HTTPS, minimum TLS version and HSTS',
  'Queues and Vectorize indexes for Workers',
  "Turnstile widgets, with the widget's secret written to a Secret",
  'Workers custom domains, next to `WorkerRoute`',
  'Hyperdrive connections, with the database password read from a Secret',
  'Bulk redirects',
  'Managed ruleset exceptions',
];
