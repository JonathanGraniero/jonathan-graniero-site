/**
 * Stub blog posts. Replace with real writing (or manage via /admin) — the seed
 * only inserts posts whose slug doesn't already exist, so edits are preserved.
 */
export interface SeedPost {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  publishedAt: string | null; // null => draft
  contentMd: string;
}

export const seedPosts: SeedPost[] = [
  {
    slug: 'hello-world',
    title: 'Hello, world — why I built this site',
    excerpt:
      'A home on the internet I actually own: what this site is for, how it is built, and what to expect here.',
    tags: ['Meta', 'Self-hosting'],
    publishedAt: '2026-01-12T15:00:00Z',
    contentMd: `After years of scattering notes across gists, READMEs and half-finished drafts, I wanted one place I control end to end. This is it.

## What you'll find here

- **Engineering notes** — things I learned the hard way, written down so I only learn them once.
- **Project write-ups** — what I built, the trade-offs, and what I'd do differently.
- **Career** — a living résumé on the [about page](/about).

## How it's built

The site is a small monorepo:

| Layer    | Tech                                    |
| -------- | --------------------------------------- |
| Frontend | React, Vite, TanStack Query, Tailwind   |
| API      | NestJS, Prisma, PostgreSQL              |
| Contract | A shared TypeScript package of API types |

The API and the client share one set of types, so a renamed field is a compile error rather than a production bug.

> The best time to start writing things down was years ago. The second best time is now.

Thanks for stopping by.`,
  },
  {
    slug: 'writing-a-kubernetes-controller',
    title: 'Writing a Kubernetes controller: lessons from the reconcile loop',
    excerpt:
      'Level-triggered thinking, idempotency, and why your reconcile function should assume it has never run before.',
    tags: ['Kubernetes', 'Go'],
    publishedAt: '2026-02-03T14:30:00Z',
    contentMd: `Controllers look simple: watch some objects, make the world match the spec. The subtlety is in *how* you make it match.

## Level-triggered, not edge-triggered

It is tempting to write handlers like "on create, do X; on delete, do Y". Events get dropped, coalesced and replayed, so that model breaks. Instead, every reconcile should answer one question:

> Given the desired state and the observed state, what is the next step?

\`\`\`go
func (r *WidgetReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var widget v1alpha1.Widget
    if err := r.Get(ctx, req.NamespacedName, &widget); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    desired := buildDeployment(&widget)
    if err := ctrl.SetControllerReference(&widget, desired, r.Scheme); err != nil {
        return ctrl.Result{}, err
    }

    // CreateOrUpdate is idempotent: safe to call on every reconcile.
    _, err := controllerutil.CreateOrUpdate(ctx, r.Client, desired, func() error {
        return mutateDeployment(desired, &widget)
    })
    return ctrl.Result{}, err
}
\`\`\`

## Three rules I now follow

1. **Idempotent everything.** Reconcile may run ten times for one change.
2. **Status is an output.** Never read your own status to decide what to do.
3. **Finalizers are a promise.** If you add one, make sure removal can't get stuck.

## Testing

\`envtest\` spins up a real API server and etcd without a kubelet, which is the sweet spot between unit tests and a full cluster.`,
  },
  {
    slug: 'type-safe-apis-with-nestjs',
    title: 'Type-safe APIs with NestJS and a shared contract package',
    excerpt:
      'How a tiny types-only workspace package keeps a NestJS API and a React client honest with each other.',
    tags: ['TypeScript', 'NestJS', 'React'],
    publishedAt: '2026-03-18T16:00:00Z',
    contentMd: `A frontend and backend in one repo should never disagree about the shape of a response. Here is the pattern this site uses.

## The contract

A \`@site/shared\` package contains **only types**:

\`\`\`ts
export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  publishedAt: string | null; // ISO-8601 on the wire
  tags: Tag[];
}
\`\`\`

## The server side

DTOs \`implement\` the shared input types, so validation rules and the contract can't drift:

\`\`\`ts
export class CreatePostDto implements CreatePostInput {
  @IsString()
  @MaxLength(200)
  title: string;
}
\`\`\`

Services return the shared output types via small mapper functions. That keeps Prisma models — and their \`Date\` objects — from leaking into responses.

## The client side

\`\`\`ts
export const postsApi = {
  list: (q: PostListQuery) => http<Paginated<PostSummary>>(\`/posts\${toSearch(q)}\`),
};
\`\`\`

Rename a field in the contract and both apps fail to compile. That's the whole point.`,
  },
  {
    slug: 'postgres-full-text-search-is-enough',
    title: 'Postgres full-text search is probably enough',
    excerpt:
      "Before reaching for Elasticsearch, try tsvector, a GIN index and prefix matching. For a blog, it's plenty.",
    tags: ['PostgreSQL', 'Backend'],
    publishedAt: '2026-05-06T13:00:00Z',
    contentMd: `Search on this site is plain Postgres. No extra services, no sync jobs.

## The index

\`\`\`sql
CREATE INDEX "Post_search_idx" ON "Post"
  USING GIN (to_tsvector('english', "title" || ' ' || "excerpt" || ' ' || "contentMd"));
\`\`\`

## Prefix matching for search-as-you-type

\`websearch_to_tsquery\` is great for complete words, but typing \`kube\` should find *Kubernetes*. Building a prefix query does it:

\`\`\`ts
const tsquery = terms.map((t) => \`\${t}:*\`).join(' & '); // "kube:* & contr:*"
\`\`\`

The terms are extracted with a Unicode-aware regex and passed as a bound parameter, so there's no injection risk.

## Ranking

\`ts_rank\` orders results by relevance, with publish date as a tie-breaker. For a few hundred posts this runs in well under a millisecond.

## When to graduate

Reach for a dedicated engine when you need typo tolerance, facets across millions of documents, or multilingual stemming. Until then, keep it boring.`,
  },
  {
    slug: 'autoscaling-on-queue-depth-with-keda',
    title: 'Autoscaling on queue depth with KEDA',
    excerpt:
      'CPU is a lagging signal for queue workers. Scaling on backlog instead — including all the way to zero.',
    tags: ['Kubernetes', 'Infrastructure'],
    publishedAt: '2026-07-22T15:45:00Z',
    contentMd: `A worker pulling from a queue can sit at low CPU while the backlog grows without bound. The fix is to scale on the thing you actually care about: **pending work**.

## A ScaledObject

\`\`\`yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: image-worker
spec:
  scaleTargetRef:
    name: image-worker
  minReplicaCount: 0
  maxReplicaCount: 30
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/000000000000/images
        queueLength: "20"   # target messages per replica
\`\`\`

## Things that bit me

- **Scale-to-zero cold starts.** The first message waits for a pod to schedule. Fine for batch work, not for anything latency-sensitive.
- **Flapping.** Tune \`cooldownPeriod\` and the HPA \`behavior\` block. Otherwise bursty queues thrash.
- **Visibility timeouts.** If processing takes longer than the timeout, messages are redelivered and the backlog looks bigger than it is.

KEDA drives a regular HPA underneath, so everything you know about HPA tuning still applies.`,
  },
  {
    slug: 'self-hosting-on-a-budget',
    title: 'Self-hosting on a budget',
    excerpt:
      'A small VPS, Docker Compose, a reverse proxy and automated backups. What it takes to run your own corner of the web.',
    tags: ['Self-hosting', 'Infrastructure'],
    publishedAt: '2026-09-02T12:00:00Z',
    contentMd: `This site runs on hardware I control. Here's the shape of the setup — the details are coming in a follow-up post.

## The pieces

1. **One small VM.** Two vCPUs and 2 GB of RAM is plenty.
2. **Docker Compose.** API, Postgres and a reverse proxy.
3. **TLS** via automatic ACME certificates.
4. **Backups.** A nightly \`pg_dump\` shipped off-box. *Untested backups are just hopes.*

## Health checks

The API exposes \`/api/health\`, which checks database connectivity. The container orchestrator and an external uptime monitor both hit it.

\`\`\`bash
curl -fsS https://example.com/api/health | jq .status
# "ok"
\`\`\`

More soon.`,
  },
  {
    slug: 'notes-on-observability',
    title: 'Notes on observability (draft)',
    excerpt: 'Structured logs first, then metrics, then traces. Unfinished thoughts.',
    tags: ['Observability'],
    publishedAt: null,
    contentMd: `**Draft — not published.**

- Structured JSON logs with request IDs
- RED metrics per route
- Tracing only once there is more than one service`,
  },
];
