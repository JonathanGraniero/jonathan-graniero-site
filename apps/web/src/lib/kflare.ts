/**
 * Static facts for the kflare case study (/projects/kflare) and the home-page
 * spotlight, taken from the kflare v0.1.0 release. Update them with each
 * release; keep them true.
 */
const REPO = 'https://github.com/JonathanGraniero/kflare';
const TAG = `${REPO}/blob/v0.1.0`;

export const KFLARE = {
  path: '/projects/kflare',
  version: '0.1.0',
  released: '2026-10-21',
  started: '2026-03',
  apiVersion: 'kflare.dev/v1alpha1',
  requires: 'Kubernetes 1.34+, Helm 3.8+',
  platforms: ['linux/amd64', 'linux/arm64'],
  license: 'MIT',
  links: {
    repo: REPO,
    artifactHub: 'https://artifacthub.io/packages/helm/kflare/kflare',
    release: `${REPO}/releases/tag/v0.1.0`,
    quickstart: `${TAG}/README.md#quickstart-expose-a-service-through-a-cloudflare-tunnel`,
    deploy: `${TAG}/docs/deploy.md`,
    architecture: `${TAG}/ARCHITECTURE.md`,
    roadmap: `${REPO}/blob/main/ROADMAP.md`,
    discussions: `${REPO}/discussions`,
    issues: `${REPO}/issues`,
  },
  post: '/blog/building-kflare-kubernetes-operator-for-cloudflare',
  install: `helm install kflare oci://ghcr.io/jonathangraniero/charts/kflare \\
  --version 0.1.0 --namespace kflare-system --create-namespace`,
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
  ],
  /** Kinds kflare-gen generates from cloudflare-go v7 and Cloudflare's OpenAPI spec. */
  generated: [
    'KVNamespace',
    'D1Database',
    'TransformRule',
    'RedirectRule',
    'CacheRule',
    'ConfigurationRule',
    'OriginRule',
  ],
} as const;

export const KFLARE_KIND_COUNT = KFLARE.areas.reduce((n, a) => n + a.kinds.length, 0);

/** Projects that have their own page, keyed by project name. */
export const CASE_STUDIES: Record<string, string> = { kflare: KFLARE.path };
