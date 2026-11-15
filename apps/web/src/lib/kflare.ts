/**
 * Static facts for the kflare case study (/projects/kflare) and the home-page
 * spotlight, taken from the kflare v0.4.3 release. Update them with each
 * release; keep them true.
 */
const REPO = 'https://github.com/JonathanGraniero/kflare';
const TAG = `${REPO}/blob/v0.4.3`;

export const KFLARE = {
  path: '/projects/kflare',
  version: '0.4.3',
  released: '2026-11-11',
  started: '2026-03',
  apiVersion: 'kflare.dev/v1alpha1',
  requires: 'Kubernetes 1.34+, Helm 3.8+',
  platforms: ['linux/amd64', 'linux/arm64'],
  license: 'MIT',
  links: {
    repo: REPO,
    site: 'https://kflare.dev',
    docs: 'https://kflare.dev/docs/',
    artifactHub: 'https://artifacthub.io/packages/helm/kflare/kflare',
    release: `${REPO}/releases/tag/v0.4.3`,
    quickstart: `${TAG}/README.md#quickstart-expose-a-service-through-a-cloudflare-tunnel`,
    deploy: `${TAG}/docs/deploy.md`,
    architecture: `${TAG}/ARCHITECTURE.md`,
    roadmap: `${REPO}/blob/main/ROADMAP.md`,
    discussions: `${REPO}/discussions`,
    issues: `${REPO}/issues`,
  },
  post: '/blog/building-kflare-kubernetes-operator-for-cloudflare',
  install: `helm install kflare oci://ghcr.io/jonathangraniero/charts/kflare \\
  --version 0.4.3 --namespace kflare-system --create-namespace`,
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
  areas: [
    { area: 'Accounts', kinds: ['CloudflareAccount'] },
    { area: 'DNS', kinds: ['Zone', 'DNSRecord'] },
    { area: 'Tunnels', kinds: ['Tunnel', 'TunnelConfiguration'] },
    {
      area: 'Workers and storage',
      kinds: ['WorkerScript', 'WorkerRoute', 'KVNamespace', 'R2Bucket', 'D1Database'],
    },
    { area: 'Security', kinds: ['WAFCustomRule', 'RateLimitRule', 'ManagedRuleset', 'IPList'] },
    {
      area: 'Rules',
      kinds: ['TransformRule', 'RedirectRule', 'CacheRule', 'ConfigurationRule', 'OriginRule'],
    },
    { area: 'Zone settings', kinds: ['ManagedTransform'] },
  ],
  /**
   * Kinds kflare-gen generates (types, controller glue and envtest specs) from
   * cloudflare-go v7 and Cloudflare's OpenAPI spec: every kind but
   * CloudflareAccount, since v0.4.0.
   */
  generated: [
    'Zone',
    'DNSRecord',
    'Tunnel',
    'TunnelConfiguration',
    'WorkerScript',
    'WorkerRoute',
    'KVNamespace',
    'R2Bucket',
    'D1Database',
    'WAFCustomRule',
    'RateLimitRule',
    'ManagedRuleset',
    'IPList',
    'TransformRule',
    'RedirectRule',
    'CacheRule',
    'ConfigurationRule',
    'OriginRule',
    'ManagedTransform',
  ],
} as const;

export const KFLARE_KIND_COUNT = KFLARE.areas.reduce((n, a) => n + a.kinds.length, 0);

/** Projects that have their own page, keyed by project name. */
export const CASE_STUDIES: Record<string, string> = { kflare: KFLARE.path };
