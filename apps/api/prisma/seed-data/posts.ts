/**
 * Blog posts seeded into a fresh database. Written from the projects in this
 * repo's sibling directories (kflare, the ACK Glue controller, this site).
 * The seed only inserts posts whose slug doesn't exist yet, so edits made
 * through /admin are preserved.
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
    tags: ['Meta'],
    publishedAt: '2026-09-28T12:00:00Z',
    contentMd: `My notes have always ended up scattered across gists, READMEs, PR descriptions and half-finished drafts. This site gives them one home, and it's one I control end to end.

## What you'll find here

- **Engineering write-ups.** Mostly Kubernetes controllers, AWS and backend services — the things I spend my time building.
- **Project notes.** What I built, the trade-offs, and what I'd do differently. Start with [kflare](/blog/building-kflare-kubernetes-operator-for-cloudflare) or my work on the [ACK Glue controller](/blog/adding-a-database-resource-to-the-ack-glue-controller).
- **Career.** A living résumé on the [about page](/about).

## How it's built

The site is a small monorepo:

| Layer    | Tech                                     |
| -------- | ---------------------------------------- |
| Frontend | React, Vite, TanStack Query, Tailwind    |
| API      | NestJS, Prisma, PostgreSQL               |
| Contract | A shared TypeScript package of API types |

The API and the client share one set of types, so a renamed field is a compile error rather than a production bug. I wrote up [how that works](/blog/type-safe-apis-with-nestjs), along with why [Postgres full-text search](/blog/postgres-full-text-search-is-enough) is all the search a blog needs.

Thanks for stopping by.`,
  },
  {
    slug: 'building-kflare-kubernetes-operator-for-cloudflare',
    title: 'Building kflare: lessons from a Kubernetes operator for Cloudflare',
    excerpt:
      'Narrow interfaces for testability, sorting Cloudflare errors into terminal and retryable, and adopting records that already exist — notes from building a Cloudflare operator in Go.',
    tags: ['Kubernetes', 'Go', 'Cloudflare'],
    publishedAt: '2026-09-28T12:10:00Z',
    contentMd: `[kflare](https://github.com/JonathanGraniero/kflare) is a Kubernetes operator for Cloudflare. Instead of clicking through the dashboard or scripting API calls, you describe DNS zones and records as Kubernetes custom resources, commit them to git, and let the operator make Cloudflare match.

There are community operators in this space already, but the ones I found were narrowly scoped or inconsistently maintained. I wanted one built to production standards from the start: consistent patterns across every controller, real tests, and no shortcuts.

## The resource model

Resources form a dependency chain:

- **CloudflareAccount** (cluster-scoped) points at a Kubernetes \`Secret\` holding an API token, and validates the token against the Cloudflare API on every reconcile.
- **Zone** references an account and manages a Cloudflare zone.
- **DNSRecord** references a zone and manages a single record.

Because each resource depends on the one above it, most of a reconciler's early work is walking that chain and reporting *precisely* what's missing. A DNSRecord's \`Ready\` condition can say \`ZoneNotFound\`, \`ZoneNotReady\`, \`AccountNotReady\`, \`SecretNotFound\` or \`TokenKeyMissing\`. Each one tells whoever runs \`kubectl describe\` exactly what to fix.

## Terminal vs. retryable errors

The most important decision in any controller is what to do when an API call fails. Retrying a revoked token forever just burns rate limit. Giving up on a 503 leaves the resource broken until someone pokes it.

kflare centralises that decision in one function:

\`\`\`go
func IsTerminalError(err error) bool {
    if err == nil {
        return false
    }
    // HTTP 403 — token lacks the required permission.
    // cloudflare-go counterintuitively names this AuthenticationError.
    var authErr *cf.AuthenticationError
    if errors.As(err, &authErr) {
        return true
    }
    // HTTP 401 — bad or revoked token (named AuthorizationError).
    var authzErr *cf.AuthorizationError
    if errors.As(err, &authzErr) {
        return true
    }
    // ...404s and other 4xx request errors are terminal too.

    // Rate limits (429), 5xx and network failures are retryable:
    // controller-runtime's exponential back-off handles them.
    return false
}
\`\`\`

Terminal errors set a condition and stop requeuing. Everything else returns the error, and controller-runtime backs off and tries again.

### The bug that tests didn't catch

The first version used **value** types as the \`errors.As\` targets (\`var authErr cf.AuthenticationError\`). The unit tests constructed errors as values too, so everything passed.

But cloudflare-go's HTTP layer returns **pointers** (\`*cf.AuthenticationError\`), and \`errors.As\` matches on the exact type. In production, \`IsTerminalError\`, \`IsNotFound\` and \`IsRateLimit\` would have silently missed *every* real SDK error. A revoked token would have been retried forever.

The fix was one character per check. The lesson was bigger: **fakes must reproduce the contract of the thing they replace, including pointer-ness.** The tests now build errors exactly the way the SDK does.

## Find, adopt, or create

A reconciler should assume it has never run before. For DNS records that means three paths:

1. If status already has a record ID, fetch it. If it was deleted outside the operator, fall through and recreate it.
2. Otherwise, **list** records with the same name and type. If one exists, adopt it rather than creating a duplicate.
3. Only if nothing matches, create a new record.

Adoption matters more than it sounds. Nobody starts using an operator with an empty Cloudflare account, and "import" should be a no-op, not a migration.

## Drift detection, and an SRV surprise

After the record exists, the controller compares the spec against what Cloudflare reports: content, TTL, proxied, priority, comment and tags (sorted, since order doesn't matter). If anything differs, it issues a single update.

One field can't be compared directly. For **SRV** records, Cloudflare generates the \`content\` field from the structured \`data\` block. The spec and the API never agree byte-for-byte, and a naive comparison would "fix" the record on every reconcile. The drift check skips \`content\` for SRV records and compares the structured fields instead.

## Testing without a Cloudflare account

Each controller depends on a narrow interface containing only the API methods it calls:

\`\`\`go
type DNSRecordAPI interface {
    CreateDNSRecord(ctx context.Context, rc *cf.ResourceContainer, params cf.CreateDNSRecordParams) (cf.DNSRecord, error)
    GetDNSRecord(ctx context.Context, rc *cf.ResourceContainer, recordID string) (cf.DNSRecord, error)
    ListDNSRecords(ctx context.Context, rc *cf.ResourceContainer, params cf.ListDNSRecordsParams) ([]cf.DNSRecord, *cf.ResultInfo, error)
    UpdateDNSRecord(ctx context.Context, rc *cf.ResourceContainer, params cf.UpdateDNSRecordParams) (cf.DNSRecord, error)
    DeleteDNSRecord(ctx context.Context, rc *cf.ResourceContainer, recordID string) error
}
\`\`\`

The real \`*cloudflare.API\` satisfies it for free, and tests inject a fake through a constructor field on the reconciler. Combined with \`envtest\` (a real API server and etcd, no kubelet), that covers terminal and retryable errors, adoption, recreation after external deletion, drift, and both deletion policies. Coverage on the controller and shared packages is in the high 90s. More importantly, those tests are what caught the SRV behaviour.

## Status and what's next

\`CloudflareAccount\` and \`Zone\` are done. \`DNSRecord\` is in review as an open PR. Tunnels and Workers come next. The longer-term plan is to generate CRD types and client wrappers from Cloudflare's OpenAPI spec, so coverage can grow without hand-writing every resource.`,
  },
  {
    slug: 'adding-a-database-resource-to-the-ack-glue-controller',
    title: 'Adding a Database resource to the ACK Glue controller',
    excerpt:
      "What it takes to add a new resource to an AWS Controllers for Kubernetes service controller — generator config, flattening Glue's nested input, and the hooks the generator can't write for you.",
    tags: ['Kubernetes', 'AWS', 'Go', 'Open Source'],
    publishedAt: '2026-09-28T12:20:00Z',
    contentMd: `[AWS Controllers for Kubernetes](https://github.com/aws-controllers-k8s) (ACK) lets you manage AWS resources as Kubernetes custom resources. The Glue controller could manage Jobs, but not the Data Catalog. So I [opened a PR](https://github.com/aws-controllers-k8s/glue-controller/pull/16) adding a \`Database\` resource. That's the natural starting point, because Databases and Tables are the minimum you need before catalogs are useful.

This post covers what adding a resource to an ACK controller actually involves.

## Most of a controller is generated

ACK controllers are mostly code-generated from the AWS SDK's API models. Enabling a new resource starts in \`generator.yaml\`, which begins with a long \`ignore\` list of resources the controller doesn't support. Supporting Database starts by un-ignoring it:

\`\`\`yaml
ignore:
  resource_names:
    - Crawler
    # - Database
    - DevEndpoint
\`\`\`

Run the code generator and you get CRD types, a resource manager, delta comparison, RBAC and Helm chart updates. The interesting work is everything it *can't* infer.

## Flattening Glue's nested input

Glue's API wraps every database field in a \`DatabaseInput\` struct:

\`\`\`
CreateDatabase(CatalogId, DatabaseInput{Name, Description, LocationUri, Parameters, ...}, Tags)
\`\`\`

Generated naïvely, that produces a CRD where users write \`spec.databaseInput.name\`. That's awkward, and it isn't how other ACK resources look. My first iteration shipped that shape. The maintainers' first review question was whether to unwrap it and fold the fields into the spec itself. It was the right call:

\`\`\`yaml
apiVersion: glue.services.k8s.aws/v1alpha1
kind: Database
metadata:
  name: analytics
spec:
  name: analytics
  description: Curated analytics tables
  locationURI: s3://my-bucket/analytics/
\`\`\`

In \`generator.yaml\`, that means ignoring the wrapper field on the create and update inputs, then declaring each top-level field and where to read it back from:

\`\`\`yaml
field_paths:
  - CreateDatabaseInput.DatabaseInput
  - UpdateDatabaseInput.DatabaseInput
resources:
  Database:
    fields:
      Name:
        is_primary_key: true
        from:
          operation: GetDatabase
          path: Database.Name
      LocationURI:
        from:
          operation: GetDatabase
          path: Database.LocationUri
\`\`\`

Review also questioned a name. Glue calls the field \`CreateTableDefaultPermissions\`, which reads like an action on a resource spec. I went with \`tableDefaultPermissions\` rather than a bare \`defaultPermissions\`, so it's clear what the permissions apply to. I also dropped a \`TargetDatabase\` field from the spec. It can't change after creation, and there's no point in a spec field users can't update.

## Hooks: the code the generator can't write

Since the generated request no longer contains \`DatabaseInput\`, something has to rebuild it. ACK exposes named hook points in the generated code. The Database resource uses several:

- **\`sdk_create_post_build_request\`** / **\`sdk_update_post_build_request\`** call a hand-written \`buildDatabaseInput\` that maps the flat spec back into Glue's nested struct, including principal permissions and federated database settings.
- **\`sdk_create_post_set_output\`** / **\`sdk_read_one_post_set_output\`** populate the resource's ARN. \`GetDatabase\` doesn't return one, so it's assembled from region, account ID and name.
- **\`sdk_update_pre_build_request\`** syncs tags through the dedicated tagging API. If tags are the *only* thing that changed, it returns early without calling \`UpdateDatabase\` at all:

\`\`\`go
if delta.DifferentAt("Spec.Tags") {
    if err := rm.syncTags(ctx, desired, latest); err != nil {
        return nil, err
    }
}
if !delta.DifferentExcept("Spec.Tags") {
    return desired, nil
}
\`\`\`

## Testing against a real account

Unit tests only go so far with a generated controller. The question that matters is whether it creates a real Glue database. My loop was:

1. Create a local \`kind\` cluster.
2. Build the controller image from the PR branch and load it into the cluster.
3. Install the CRDs and chart, pointed at my own AWS account.
4. Apply a \`Database\` manifest, check it appears in Glue, then edit it, re-tag it and delete it.

The PR also adds e2e tests to ACK's Python test suite, so the maintainers' CI exercises the same lifecycle.

## What I learned

- **Follow the prior art.** I modelled the change on an earlier PR that added a resource to the same controller. Consistency is most of what reviewers are checking for.
- **Design the CRD for users, not the SDK.** The SDK's shape is an implementation detail. Flattening was more work, but it's the difference between a resource people enjoy using and one they tolerate.
- **Your toolchain is part of the diff.** At one point my PR changed the *Jobs* CRD, which I hadn't touched. The reviewers flagged the changes as breaking. The cause was a different Go SDK version on my machine, so the generator produced different output. Pin the versions CI uses, and treat unexpected generated changes as a signal, not noise.

## Still open

The PR is still in review, and there's real feedback left to address:

- **Tags at creation time.** \`CreateDatabase\` accepts initial tags, and setting them there (instead of in a follow-up update) matters for tag-based IAM policies.
- **Partitions.** The ARN is built with a hard-coded \`aws\` partition. ACK resources now carry the partition in their status metadata, so that can be fixed properly.
- **Spurious deltas.** Glue can fill in a default for one field after creation, which would show up as drift on every reconcile until the field is marked as late-initialized.

Tables are the natural next step after that, and once Tables exist, catalogs become useful.`,
  },
  {
    slug: 'when-adopt-or-create-should-mean-upsert',
    title: 'When adopt-or-create should mean upsert',
    excerpt:
      "ACK's adopt-or-create annotation adopts an existing AWS resource — then fails if it doesn't already match your spec. Why I think the manifest should win.",
    tags: ['Kubernetes', 'AWS', 'Open Source'],
    publishedAt: '2026-09-28T12:30:00Z',
    contentMd: `AWS Controllers for Kubernetes (ACK) can *adopt* an existing AWS resource instead of creating a new one. With the \`services.k8s.aws/adoption-policy: adopt-or-create\` annotation, ACK adopts the resource if it exists and creates it if it doesn't. That's exactly what you want when moving existing infrastructure under GitOps.

In practice, I hit a sharp edge.

## The problem

Say an SQS queue named \`my-queue\` already exists, identical to my manifest except for one field: \`visibilityTimeout\` is 300 in AWS and different in the spec.

\`\`\`yaml
apiVersion: sqs.services.k8s.aws/v1alpha1
kind: Queue
metadata:
  name: my-queue
  annotations:
    services.k8s.aws/adoption-policy: adopt-or-create
spec:
  queueName: my-queue
  # ...everything matches AWS except visibilityTimeout
\`\`\`

The first reconcile adopts the queue. On the next reconcile, the controller notices the spec and the deployed resource differ, and instead of reconciling the difference, it **errors out on the mismatch**. The resource is stuck: adopted, but never brought in line with the manifest.

## What I think should happen

When you apply a manifest, the manifest is the source of truth. That's the whole premise of declarative infrastructure. So after adoption, the desired state should simply be applied. Adopt-or-create should behave as an **upsert**:

- If the resource doesn't exist, create it from the spec.
- If it exists, adopt it, then update it to match the spec.

## The proposal

I [opened a PR against the ACK runtime](https://github.com/aws-controllers-k8s/runtime/pull/184), linked to [the community issue](https://github.com/aws-controllers-k8s/community/issues/2481). The idea was to treat the desired manifest as authoritative after adoption. The normal reconcile loop then computes a delta against the live resource and overrides the deployed values with the spec's.

I opened it as a draft to get the change visible early while I finished the tests. It never made it out of draft, and the bot eventually closed it as stale. That's worth being honest about: a draft PR is not a finished contribution. If I did it again, I'd land a failing test that reproduces the bug first, because that's the most convincing thing you can put in front of maintainers.

## The broader point

"Adopt" can mean two things:

1. **Observe:** take ownership, but treat the live resource as truth.
2. **Converge:** take ownership, then make it match the declared state.

Both are legitimate. But a tool that adopts and then *errors* on drift gives you neither. If you're designing adoption for your own controllers, pick one of these explicitly. For GitOps workflows, it's almost always the second.`,
  },
  {
    slug: 'type-safe-apis-with-nestjs',
    title: 'Type-safe APIs with NestJS and a shared contract package',
    excerpt:
      'How a tiny types-only workspace package keeps a NestJS API and a React client honest with each other.',
    tags: ['TypeScript', 'NestJS', 'React'],
    publishedAt: '2026-09-28T12:40:00Z',
    contentMd: `A frontend and backend in the same repo should never disagree about the shape of a response. Here's the pattern this site uses.

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

Types-only is deliberate. Neither app imports it at runtime, which sidesteps every CommonJS/ESM interop headache between NestJS and Vite.

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
export const api = {
  posts: {
    list: (q: PostListQuery) => http<Paginated<PostSummary>>(\`/posts\${toSearch(q)}\`),
  },
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
    publishedAt: '2026-09-28T12:50:00Z',
    contentMd: `Search on this site is plain Postgres: no extra services, no sync jobs.

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

The terms come from a Unicode-aware regex and are passed as a bound parameter, so there's no injection risk.

## Ranking

\`ts_rank\` orders results by relevance, with publish date as the tie-breaker.

## When to graduate

Reach for a dedicated search engine when you need typo tolerance, facets across millions of documents, or multilingual stemming. Until then, keep it boring.`,
  },
];
