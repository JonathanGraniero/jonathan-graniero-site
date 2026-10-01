/**
 * Blog posts. `npm run db:seed` inserts any whose slug doesn't exist yet;
 * `npm run db:seed -- --sync` also overwrites existing ones (content, tags and
 * publish date) so this file can be the source of truth for them.
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
    slug: 'when-adopt-or-create-should-mean-upsert',
    title: 'adopt-or-create should probably just be upsert',
    excerpt:
      "ACK can adopt an existing AWS resource, and then immediately error because it doesn't match your manifest. I tried to change that and didn't finish.",
    tags: ['Kubernetes', 'AWS', 'Open Source'],
    publishedAt: '2025-06-10T14:12:00Z',
    contentMd: `If you use [AWS Controllers for Kubernetes](https://github.com/aws-controllers-k8s) (ACK), there's an annotation that sounds like exactly what you want when you're moving existing infrastructure into GitOps:

\`\`\`yaml
services.k8s.aws/adoption-policy: adopt-or-create
\`\`\`

If the resource exists, ACK adopts it. If it doesn't, ACK creates it. Great.

Except I ran into this: I had an SQS queue that already existed and matched my manifest except for one field (\`visibilityTimeout\` was 300 in AWS and something else in the spec). The first reconcile adopted it fine. The next reconcile noticed the difference and errored out instead of fixing it, and the queue just sat there adopted-but-broken.

That felt backwards to me. I'm applying a manifest. The manifest is supposed to be the source of truth, that's the whole reason I'm doing this in git. So after adopting, the controller should push the spec onto the real resource, basically an upsert.

## What I tried

I [opened a PR against the ACK runtime](https://github.com/aws-controllers-k8s/runtime/pull/184) (linked to [this issue](https://github.com/aws-controllers-k8s/community/issues/2481)) that treats the desired manifest as the latest state after adoption, so the normal reconcile loop computes a delta and overwrites the deployed values.

I opened it as a draft so I could see the diff while I worked on tests... and then I didn't get back to it. It went stale and the bot closed it.

That one's on me. If I pick it back up, I'd start with a failing test that reproduces the bug before touching any logic. That's the thing maintainers actually want to see, and it would have kept me honest about finishing.

## The general point

"Adopt" can mean two different things:

1. Take ownership, and treat whatever's live as the truth.
2. Take ownership, then make it match what I declared.

Both are reasonable! But picking one and doing it consistently matters more than which one you pick. Adopting and then erroring on drift gives you neither. For GitOps I want the second one pretty much every time.`,
  },
  {
    slug: 'adding-a-database-resource-to-the-ack-glue-controller',
    title: 'My first real PR to ACK: a Database resource for the Glue controller',
    excerpt:
      'What adding a resource to an ACK controller actually involved: generator config, un-nesting a Glue API struct, some hand-written hooks, and a few rounds of (very good) review.',
    tags: ['Kubernetes', 'AWS', 'Go', 'Open Source'],
    publishedAt: '2026-03-19T01:37:00Z',
    contentMd: `The ACK Glue controller could manage Glue Jobs, but nothing in the Data Catalog. I wanted catalogs eventually, and you can't get there without Databases and Tables, so in February I [opened a PR](https://github.com/aws-controllers-k8s/glue-controller/pull/16) to add a \`Database\` resource.

I used an earlier PR that added a resource to the same controller as my guide, which I'd recommend to anyone doing this. Most of what reviewers care about is "does it look like the rest of the codebase".

## Most of it is generated

ACK controllers are mostly generated from the AWS SDK models. Turning on a resource starts with commenting it out of the ignore list in \`generator.yaml\`:

\`\`\`yaml
ignore:
  resource_names:
    - Crawler
    # - Database
    - DevEndpoint
\`\`\`

Run the generator and you get the CRD, the resource manager, delta comparison, RBAC and Helm changes. The actual work is everything the generator can't figure out.

## Un-nesting DatabaseInput

Glue wraps every database field in a \`DatabaseInput\` struct, so my first version produced a CRD where you wrote \`spec.databaseInput.name\`. It worked, but it's awkward and nothing else in ACK looks like that. The first review question was basically "should we unwrap this into the spec?" and yeah, obviously.

So now it reads like a normal ACK resource:

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

Getting there meant ignoring the wrapper on the create/update inputs in \`generator.yaml\`, then declaring each top-level field and where to read it back from \`GetDatabase\`. Review also pushed back on the name \`CreateTableDefaultPermissions\` (reads like an action, not a field). We landed on \`tableDefaultPermissions\` so it's at least clear what the permissions apply to. I also dropped \`TargetDatabase\` from the spec entirely, since it can't change after creation.

## Hooks

Once the generated request doesn't include \`DatabaseInput\` anymore, something has to build it again. ACK has named hook points for this. I ended up with a hand-written \`buildDatabaseInput\` called from the create and update hooks, hooks that set the ARN after create and read (\`GetDatabase\` doesn't return one), and tag syncing on update that skips the update call entirely if tags were the only change:

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

## Testing it for real

Unit tests don't tell you much with generated code. What I actually wanted to know was whether it makes a Glue database. So: a local \`kind\` cluster, build the controller image from my branch, install the chart pointed at my own AWS account, apply a \`Database\`, then go poke at it in the console. Edit it, re-tag it, delete it. The PR also adds e2e tests to ACK's Python suite.

## Things that bit me

At one point my PR was changing the *Jobs* CRD, which I hadn't touched. The reviewers (fairly) flagged it as a breaking change. The cause was embarrassing: I had a different Go SDK version installed than CI, so the generator produced different output. Pin your versions, and treat any generated diff you didn't expect as a bug.

## Where it's at

Still open. There's real feedback left: set tags at create time instead of in a follow-up update (matters for tag-based IAM policies), stop hardcoding the \`aws\` partition in the ARN, and deal with a field Glue fills in after creation that shows up as drift every reconcile. Then Tables.

Big thanks to the ACK maintainers. The reviews were fast and genuinely helpful.`,
  },
  {
    slug: 'building-kflare-kubernetes-operator-for-cloudflare',
    title: 'kflare: a Cloudflare operator, and the bug my tests happily passed',
    excerpt:
      'I started a Kubernetes operator for Cloudflare over a weekend. Notes on error handling, adopting records that already exist, an SRV quirk, and an errors.As mistake my own tests hid.',
    tags: ['Kubernetes', 'Go', 'Cloudflare'],
    publishedAt: '2026-04-07T23:05:00Z',
    contentMd: `I wanted my Cloudflare DNS in git, managed the same way as everything else in the cluster. There are a few community operators for this, but the ones I found were either narrow or not really maintained. So one weekend in March I started [kflare](https://github.com/JonathanGraniero/kflare).

It's early. Right now there are three resources that chain together:

- \`CloudflareAccount\` (cluster-scoped) points at a Secret with an API token and checks the token actually works.
- \`Zone\` references an account.
- \`DNSRecord\` references a zone. (This one is still in an open PR.)

Since everything depends on the thing above it, a lot of each reconcile is just walking up the chain and saying exactly what's missing. \`kubectl describe\` on a broken DNSRecord tells you \`ZoneNotReady\` or \`SecretNotFound\` or \`TokenKeyMissing\` instead of a vague "failed".

## Which errors to retry

The decision I spent the most time on was what to do when the Cloudflare API fails. Retrying a revoked token forever is pointless. Giving up on a 503 is also wrong. I ended up with one function all the controllers use:

\`\`\`go
func IsTerminalError(err error) bool {
    if err == nil {
        return false
    }
    // 403: token is missing a permission.
    // (cloudflare-go calls this AuthenticationError, which confused me for a while)
    var authErr *cf.AuthenticationError
    if errors.As(err, &authErr) {
        return true
    }
    // 401: bad or revoked token (and yes, this one is AuthorizationError)
    var authzErr *cf.AuthorizationError
    if errors.As(err, &authzErr) {
        return true
    }
    // ...404s and other 4xx request errors are terminal too.

    // 429s, 5xx and network errors: let controller-runtime back off and retry.
    return false
}
\`\`\`

Terminal errors set a condition and stop. Everything else gets returned so controller-runtime's backoff handles it.

## The bug my tests didn't catch

The first version of that function used value types as the \`errors.As\` targets (\`var authErr cf.AuthenticationError\`). My tests also built the errors as values. So everything passed.

cloudflare-go returns *pointers* from its HTTP layer, though, and \`errors.As\` is picky about the exact type. In real life none of those checks would have matched, ever. A revoked token would have been retried forever.

I found it while writing the Zone controller. The fix was a few asterisks. The actual lesson for me was that my fake was wrong, not my code. If a test double doesn't behave like the real thing (down to pointer vs value), the tests are just agreeing with themselves.

## Adopting records that already exist

Nobody starts using a DNS operator with an empty Cloudflare account, so "create" can't be the default path. The DNSRecord reconciler goes:

1. If status has a record ID, fetch it. If it was deleted out from under us, fall through.
2. Otherwise list records with the same name and type, and if one exists, adopt it.
3. Only create if nothing matches.

Importing an existing record should be a no-op, not a migration.

## The SRV thing

After a record exists, the controller compares spec to what Cloudflare reports and sends one update if anything drifted. That works for everything except SRV records. Cloudflare generates the \`content\` field for SRV from the structured \`data\` block, so it never matches the spec byte for byte, and a naive diff "fixes" the record on every single reconcile. I skip \`content\` for SRV and compare the structured fields instead.

## Testing without hitting Cloudflare

Each controller takes a small interface with just the API methods it calls (the real \`*cloudflare.API\` satisfies it for free), and tests swap in a fake. Combined with \`envtest\` for a real API server, that covers the error paths, adoption, recreation, drift and deletion without an account. Coverage on the controller packages is in the high 90s.

Next up is getting DNSRecord merged, then tunnels. Eventually I'd like to generate most of this from Cloudflare's OpenAPI spec instead of writing each resource by hand.`,
  },
  {
    slug: 'type-safe-apis-with-nestjs',
    title: 'Sharing types between a NestJS API and a React app',
    excerpt:
      'The small setup that keeps this site’s frontend and backend from disagreeing about what a post looks like.',
    tags: ['TypeScript', 'NestJS', 'React'],
    publishedAt: '2026-09-15T00:48:00Z',
    contentMd: `This site is a NestJS API and a React app in one repo. The bug I most wanted to avoid was the boring one: the API renames a field, the frontend keeps reading the old name, and nothing complains until someone loads the page.

What I landed on is a tiny workspace package, \`@site/shared\`, that only contains types:

\`\`\`ts
export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  publishedAt: string | null; // ISO-8601 on the wire
  tags: Tag[];
}
\`\`\`

Types only, on purpose. Neither app imports it at runtime, which let me skip every CommonJS vs ESM headache between Nest and Vite.

On the API side, DTOs implement the shared input types, so the validation rules and the contract can't quietly drift apart:

\`\`\`ts
export class CreatePostDto implements CreatePostInput {
  @IsString()
  @MaxLength(200)
  title: string;
}
\`\`\`

Services map Prisma rows into the shared output types before returning them. That keeps Prisma's \`Date\` objects and internal columns out of the responses.

The client just uses the same types:

\`\`\`ts
export const api = {
  posts: {
    list: (q: PostListQuery) => http<Paginated<PostSummary>>(\`/posts\${toSearch(q)}\`),
  },
};
\`\`\`

Now if I rename a field, both apps fail to compile. It's not fancy (no codegen, no OpenAPI client), but for one person and two apps it's been plenty.`,
  },
  {
    slug: 'postgres-full-text-search-is-enough',
    title: 'Search on this blog is just Postgres',
    excerpt:
      'I almost reached for a search service. A GIN index and a bit of prefix matching turned out to be all a small blog needs.',
    tags: ['PostgreSQL', 'Backend'],
    publishedAt: '2026-09-22T20:14:00Z',
    contentMd: `When I added search here, my first instinct was some hosted search thing. Then I remembered this blog will have maybe dozens of posts, and Postgres already has full-text search.

The index:

\`\`\`sql
CREATE INDEX "Post_search_idx" ON "Post"
  USING GIN (to_tsvector('english', "title" || ' ' || "excerpt" || ' ' || "contentMd"));
\`\`\`

The one thing that bugged me was that \`websearch_to_tsquery\` only matches whole words, so typing \`kube\` didn't find anything about Kubernetes. For search-as-you-type that feels broken. Turning each word into a prefix match fixed it:

\`\`\`ts
const tsquery = terms.map((t) => \`\${t}:*\`).join(' & '); // "kube:* & contr:*"
\`\`\`

The terms get pulled out with a Unicode-aware regex and passed as a bound parameter, so nobody can sneak tsquery operators in. Results are sorted by \`ts_rank\`, then by date.

If this ever needs typo tolerance or real faceting I'll revisit it. For now it's one index and zero extra services, which is exactly how much infrastructure I want for a blog.`,
  },
  {
    slug: 'hello-world',
    title: 'Hello, world',
    excerpt:
      'I finally have a place to put things I figure out, instead of losing them in PR descriptions.',
    tags: ['Meta'],
    publishedAt: '2026-09-28T16:20:00Z',
    contentMd: `A lot of what I learn ends up buried in PR descriptions, Slack threads and half-written READMEs. This site is my attempt to stop doing that.

Mostly I'll be writing about Kubernetes operators, AWS and backend stuff, since that's what I spend my time on. There's already a bit here: notes on [kflare](/blog/building-kflare-kubernetes-operator-for-cloudflare), my Cloudflare operator, and on [adding a Database resource to the ACK Glue controller](/blog/adding-a-database-resource-to-the-ack-glue-controller).

The site itself is a NestJS API and a React app sharing [one set of types](/blog/type-safe-apis-with-nestjs), with [search that's just Postgres](/blog/postgres-full-text-search-is-enough). It runs on a Cloudflare Worker in front of AWS Lambda, which was not the plan when I started (AWS had opinions about my account), but it costs about as much per year as a sandwich, so I'm not complaining.

Thanks for reading. If something here is wrong, please tell me.`,
  },
];
