/**
 * Blog posts. `npm run db:seed` inserts any whose slug doesn't exist yet;
 * `SEED_SYNC=1 npm run db:seed` also overwrites existing ones (content, tags and
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

Both are reasonable! But picking one and doing it consistently matters more than which one you pick. Adopting and then erroring on drift gives you neither. For GitOps I want the second one pretty much every time.

> **Update (October 2026):** I never did get back to that PR. But when I built adoption into [kflare](/projects/kflare), my Cloudflare operator, I did it the second way: adoption is opt-in with an annotation, and once kflare adopts something it makes it match the manifest. There's a bit more on that in the [v0.1.0 post](/blog/kflare-v0-1-0).`,
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


Big thanks to the ACK maintainers. The reviews were fast and genuinely helpful.

> **Update (September 2026):** This one [merged](https://github.com/aws-controllers-k8s/glue-controller/pull/16) at the end of September. The [Table resource](https://github.com/aws-controllers-k8s/glue-controller/pull/37) is next, and it's in review now.`,
  },
  {
    slug: 'building-kflare-kubernetes-operator-for-cloudflare',
    title: 'kflare: a Cloudflare operator',
    excerpt:
      'I started a Kubernetes operator for Cloudflare over a weekend. Notes on error handling, adopting records that already exist, an SRV quirk, and errors.',
    tags: ['Kubernetes', 'Go', 'Cloudflare'],
    publishedAt: '2026-04-07T23:05:00Z',
    contentMd: `I wanted my Cloudflare DNS in git, managed the same way as everything else in my cluster. There are a few community operators for this, but the ones I found were either narrow or not really maintained. So one weekend in March I started [kflare](https://github.com/JonathanGraniero/kflare).

It's early. Right now there are three resources that chain together:

- \`CloudflareAccount\` (cluster-scoped) points at a Secret with an API token and checks the token actually works.
- \`Zone\` references an account.
- \`DNSRecord\` references a zone. 

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

Next up is getting DNSRecord merged, then tunnels. Eventually I'd like to generate most of this from Cloudflare's OpenAPI spec instead of writing each resource by hand.

> **Update (November 2026):** A lot has happened since this post. DNSRecord and tunnels did land, kflare is up to 20 kinds, and [v0.1.0](/blog/kflare-v0-1-0) came out in October. That last line about generating it from Cloudflare's spec happened too, and [here's how that went](/blog/generating-kflare-from-cloudflares-api-description). Some of the code above has changed since, but the lesson about fakes hasn't.`,
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

The site itself is a NestJS API and a React app sharing [one set of types](/blog/type-safe-apis-with-nestjs), with [search that's just Postgres](/blog/postgres-full-text-search-is-enough). It runs on a Cloudflare Worker in front of AWS Lambda, but it costs about as much per year as a sandwich, so I'm not complaining.

Thanks for reading. If something here is wrong, please tell me.`,
  },
  {
    slug: 'the-nhl-trade-bot-one-worker-one-sqlite-database-and-a-lot-of-regex',
    title: 'The NHL trade bot: one Worker, one SQLite database, and a lot of regex',
    excerpt:
      "How my Discord bot for confirmed NHL trades works: a Cloudflare Worker on a cron, r/hockey's RSS feed, a deliberately paranoid filter, three layers of dedupe, and Terraform for all of it. Free tier the whole way.",
    tags: ['Cloudflare', 'discord-bot', 'nhl'],
    publishedAt: '2026-10-01T18:39:24.958Z',
    contentMd: `> **Update (October 2026):** The bot is called NHL Tracker now, it reads NHL.com's transaction feed as a second source, and the regex wording rules below are gone: Claude Haiku reads the headlines instead. I wrote that up in [a follow-up post](/blog/nhl-bot-reads-headlines-with-claude-haiku). Most of the rest of this still holds.

My Discord has a lot of hockey in it, and every trade deadline goes the same way: someone posts a screenshot of an insider tweet, three people react, and then it turns out the deal "isn't done yet." I wanted a bot that only posts moves that actually happened, posts each one once, and costs nothing to run. So I built [NHL Trade Tracker](https://github.com/JonathanGraniero/NHL-Trade-Tracker).

This is a walk through how it fits together, mostly so future me remembers why things are the way they are.

## The whole thing on one screen

\`\`\`
                    every 2 min
Cloudflare cron ─────────────────► Worker: scheduled()
                                     │
                                     ├─► r/hockey RSS (newest 100 posts)
                                     ├─► classify: trusted? confirmed? which teams?
                                     ├─► D1: seen before? same move as an earlier event?
                                     └─► Discord REST: post an embed to each subscribed channel

Discord slash command ───────────► Worker: fetch() /interactions
                                     ├─► verify Ed25519 signature
                                     └─► D1: subscriptions (/subscribe, /unsubscribe, ...)
\`\`\`

One Cloudflare Worker with two entry points, one D1 database (which is SQLite), and no server anywhere. That last part was the main design constraint.

## Why there's no server

The usual way to build a Discord bot is a long-running process holding a websocket to Discord's gateway. That means something always on, which means paying for something always on.

But this bot doesn't need to *listen* to anything. It needs two things:

1. Answer slash commands. Discord can deliver those as plain HTTP POSTs to an "Interactions Endpoint URL" instead of over the gateway.
2. Check for news every couple of minutes. That's a cron.

A Worker does both of those, and the free tier is generous enough that this whole thing rounds to zero:

| Free-tier limit | What the bot uses |
|---|---|
| 100k requests/day | ~720 cron runs, plus whatever people type |
| 10 ms CPU per run | ~3 ms (parsing a 200 KB feed is most of it) |
| D1: 5M reads, 100k writes/day | ~72k reads, a few hundred writes |

The CPU limit is the one I actually watch. Time spent waiting on Reddit or Discord doesn't count, only time spent computing, so the work per run is mostly regex and a couple of queries.

## Slash commands over HTTP

Discord signs every interaction with Ed25519, and you have to reject anything that doesn't verify. They test this, too: when you save the endpoint URL in the developer portal, Discord sends a signed ping and some bad signatures and refuses to save unless you get both right. Workers have Ed25519 in WebCrypto, so that's about thirty lines.

The other catch is that you have 3 seconds to respond. Subscribing a channel is one D1 write, fine. But \`/replay\` (run a Reddit post through the pipeline on demand) has to fetch from Reddit and post to Discord, which can take longer. So it answers immediately with a "deferred" response (Discord shows "thinking…"), does the work in \`ctx.waitUntil()\`, and edits the reply when it's done.

Subscriptions are per channel, not per server, so \`#leafs\` can follow Toronto while \`#league\` follows everyone.

## Getting the news

Everything newsworthy in hockey ends up on r/hockey within minutes, tagged with who said it: \`[Friedman] ...\`, \`[LeBrun] ...\`. That's the source.

Reddit didn't make it easy:

- The JSON API returns **403** from Workers. Just blocked.
- The **RSS** feed works, but the rate limit is per IP, and Workers share Cloudflare's IPs with everyone else's Workers. The very first request I made from a Worker came back with \`x-ratelimit-remaining: 0.0\`.

So a 429 is a normal Tuesday. The scanner logs it and returns, and the next run catches up. That's fine because of one number I measured: r/hockey gets about 100 posts a day, and the feed returns the newest 100. Polling every 2 minutes isn't about not missing posts (even hourly wouldn't miss any), it only decides how fast a trade shows up in Discord.

## "Confirmed only" is the actual product

Everything else is plumbing. This part is the reason the bot exists, and it's a bunch of rules in [\`classify.ts\`](https://github.com/JonathanGraniero/NHL-Trade-Tracker/blob/main/src/news/classify.ts). A post goes out only if all of these hold:

1. **A trusted source.** A \`[Tag]\` for a real insider (Friedman, LeBrun, Johnston, Dreger, McKenzie, Seravalli, Kaplan, PuckPedia) or a team, *or* a link to nhl.com or to one of those insiders' tweets. Team press releases on r/hockey usually have no tag but link to \`nhl.com/<team>/news/...\`, and that path also tells you which team it is.
2. **No hedging** before the move is stated: "not a done deal", "closing in", "nearing", "expected", "rework", a question mark, and so on.
3. **Completed-move wording:** *acquired*, *traded*, *in exchange for*, *claimed off waivers*, *signed*, *agreed to terms*.
4. **An NHL team, and a player.** Coach and GM extensions, PTOs and AHL/KHL contracts are out.

I didn't write these from scratch. I pulled about 200 real r/hockey titles from the last six weeks and kept running the classifier over them until every post it accepted was a real, completed move. Those titles are now the test suite. The Knies trade is the best example, because it went through every stage on r/hockey in a few hours:

| Post | Result |
|---|---|
| [LeBrun] The proposed Leafs-Blue Jackets trade ... it's not a done deal yet | skipped ("proposed") |
| [Friedman] ... I believe the math forced Toronto/Columbus to rework the trade | skipped ("believe") |
| **[Friedman] Columbus: Knies, Lorentz, Andrae and a 2nd Tor: Marchenko, Miles Wood, Merzlikins** | **posted** (CBJ ↔ TOR) |
| [The Athletic] NHL trade grades: ... | skipped (not a source) |

That third one has no verb at all. Insiders write finished trades as \`Team: players / Team: players\`, so "two sides that are both teams" counts as trade wording on its own.

My favourite bug from tuning: Kaplan's "Cale Makar has agreed to an eight year extension with the Colorado Avalanche. ... He will be the highest paid player in NHL history" got rejected, because "will" is a hedge word. The fix was to only check for hedging up to the sentence that states the move. What comes after is commentary.

The bias is deliberate. If the filter misses a real move, the team's own announcement usually comes through a bit later. If it posts a fake one, everyone in the channel learns to ignore the bot. Missing a move is cheap and a false one isn't.

## Three layers of dedupe

One trade gets reported by Friedman, then LeBrun, then the team, then a dozen people asking "thoughts?". It should be posted once. The schema has a table for each layer:

1. **\`seen_items\`**: each Reddit post gets processed once.
2. **\`events\`**: one row per real-world move. A new confirmed post within 48 hours that shares two teams with an earlier trade (or a team and a player, for waivers and signings) is the same event.
3. **\`posted_messages\`**: an event goes to a channel at most once.

The order matters more than the tables. A post is only marked as seen *after* it's been posted:

\`\`\`ts
const outcome = await processItem(env, item, { now });
// Marked only after processing: if this run dies mid-post, the next run
// picks the item up again and processItem finishes the remaining channels.
await markSeen(env.DB, "reddit", item.id, now);
\`\`\`

If a run dies halfway through posting, the next run sees the same post again, finds the event it already created, and only posts to the channels missing from \`posted_messages\`. Nobody gets it twice.

Two more guards against flooding: the very first run only marks the current feed as seen and posts nothing, and anything older than 6 hours is never posted by the cron. That's also why the Knies trade needed \`/replay\` to show up. It was two days old by the time the scanner went live.

## All of it is Terraform

I started this by running \`wrangler\` commands by hand, which works until you want to know how production got the way it is. So now it's [Terraform](https://github.com/JonathanGraniero/NHL-Trade-Tracker/tree/main/infra): the D1 database, the Worker (bundle, bindings, secrets), the cron trigger and the workers.dev route. State lives in an R2 bucket on the same account.

The database and Worker already existed, so the first apply had to adopt them instead of creating new ones. \`import\` blocks made that a reviewable plan instead of a series of CLI commands:

\`\`\`hcl
import {
  to = cloudflare_d1_database.main
  id = "\${var.account_id}/2ec345c3-9173-476e-b2c0-c2b3b125f64d"
}
\`\`\`

The first plan was "4 to import, 2 to change, 0 to destroy" (the two changes being the new code and its bindings), which is exactly what you want to read before touching a database. The D1 resource also has \`prevent_destroy\`, because recreating it would quietly delete every subscription.

A GitHub Action runs it all. Pull requests get the tests plus a \`terraform plan\` in the run summary. Merging to \`main\` applies D1 migrations, runs \`terraform apply\`, re-registers the slash commands and curls the Worker to make sure it's up.

One thing I didn't know before: the R2 access keys Terraform uses for state don't need the dashboard. An R2 key pair is just a Cloudflare API token wearing a costume. The access key ID is the token's ID, and the secret is the SHA-256 of the token's value. So creating a bucket-scoped token through the API gives you S3 credentials for free.

## Testing without Cloudflare or Discord

- **D1** in tests is Node's built-in SQLite running the real migration files, so the tests and production have the same schema.
- **Signatures** are real. The test helper generates an Ed25519 key pair and signs requests the way Discord does, so the 401 path actually gets exercised.
- **Reddit** is a fixture: the real r/hockey feed from the week of the Knies trade.

92 tests, and the most useful ones are the classifier tables, because they're just real headlines and what should happen to each one.

## What's shaky

- **Reddit is a single point of failure.** If it ever starts blocking Cloudflare's IPs for RSS too, the bot goes quiet. A second source is the obvious next thing.
- **The classifier is regex.** It's well-tested regex, but new phrasing will get through or get dropped. The fix each time is the same: add the real headline to the tests and adjust.
- **\`seen_items\` grows forever.** It's a few MB a year against a 5 GB limit, so I'm going to let that one be a future problem.

That's the whole system. One Worker, one SQLite database, a cron, and a filter that would rather say nothing than say something wrong.`,
  },
  {
    slug: 'nhl-bot-reads-headlines-with-claude-haiku',
    title: "My NHL bot doesn't read headlines with regex anymore",
    excerpt:
      "The trade bot's regex classifier kept missing real moves and posting a few fake ones. Now Claude Haiku reads the wording, code checks everything else, and 730 labelled headlines keep the prompt honest.",
    tags: ['AI', 'TypeScript', 'discord-bot', 'nhl'],
    publishedAt: '2026-10-18T21:47:00Z',
    contentMd: `When I [wrote up how the NHL bot works](/blog/the-nhl-trade-bot-one-worker-one-sqlite-database-and-a-lot-of-regex), the heart of it was a pile of regex. The bot only posts a trade, waiver claim or signing once it's actually done, and "actually done" was decided by hedge words, completed-move verbs and a growing list of special cases.

That held up for about two weeks. As of Friday, the regexes are gone and Claude Haiku reads the headlines instead. This is how that went, and how I tried to keep it honest.

## One more regex, every time

Every miss went the same way. A move I knew had happened never showed up in Discord, I'd go find the headline, and it was phrased in a way I hadn't thought of. NHL.com writes "Maple Leafs complete trade with Vancouver". Insiders write "Brett Berard to Montreal for William Trudeau". Teams write "The Jets have claimed Clay Stevenson from Washington".

So I'd add a pattern. The fix for "complete trade" needed seventeen near-miss tests so it wouldn't also match "set to complete trade" or "haven't yet completed the trade", and then it needed a fix of its own. At some point I realised I was writing a worse version of English one pattern at a time, and I didn't really trust it anymore.

## Measuring before swapping anything

I didn't want to swap in a model on a hunch, and I didn't want to grade the regexes on the headlines they'd been tuned on. So I pulled 615 real headlines from the past year that the regexes had never seen (170 NHL.com transaction stories and 445 insider posts from r/hockey) and labelled each one by hand: should this be posted, and as what?

Then I ran both over them:

| | Old test headlines | Fresh headlines (wording errors) | False posts |
|---|---|---|---|
| Regexes | 0 | 40 | 10 |
| Claude Haiku 5.5 | 0 | 2 | 1 |

The 40 misses were annoying, but the 10 false posts were the number that actually bothered me. The whole point of this bot is that it doesn't post rumours, and the regexes had happily posted the Canadiens coach's extension and a team that was "finalizing a sign-and-trade".

## Code for what's certain, the model for the wording

I didn't want to hand the whole decision to a model, though. A lot of the classifier is stuff code is just better at: is this a trusted insider or nhl.com, which teams are involved, is it an NHL contract and not an AHL one, has this move already been posted. All of that stays in code.

Claude only gets the part regex was bad at, which is reading the sentence. Only headlines that already passed the code checks get sent, and it answers in a fixed shape:

\`\`\`ts
const Answer = z.object({
  reason: z.string(),
  move: z.enum(["trade", "waiver", "signing", "none"]),
  done: z.boolean(),
  players: z.array(z.string()),
});
\`\`\`

With structured output I either get that object back or I treat it as unreadable. There's no prose to parse.

The prompt is pretty much the old regex rules, written out in English for something that can actually read. It opens with the same bias the regexes had:

> A false post (announcing a trade that hasn't happened) is worse than a missed one, because a missed move gets reported again later.

Then it lists what counts as a rumour ("closing in", "expected", "would make sense"), what counts as done, and the odd grammar of hockey headlines: the simple present means it already happened ("Leafs sign Smith"), and insiders often write a finished trade as just its two sides. The examples in the prompt use made-up players, so none of them is a headline from the test set.

A couple of small things I liked:

- **Player names come from Claude**, and any name that doesn't appear in the headline is dropped. That quietly fixed an old bug where "per ESPN" could end up as a "player", and two different signings by one team could get merged by the dedupe.
- **The headline goes between tags**, with a note to treat it as text to label and not as instructions. These are Reddit titles. Somebody will try it eventually.

## Effort, and the coin flips

It runs at medium effort. At low effort it wavered on headlines like "Tampa is extending Smith 6 x $7.2M", which is a done deal once the terms are in the headline.

On the fresh set it still gets two wrong. "Ottawa is acquiring William Eklund" is honestly a coin flip between runs. The other is Malkin's contract details, which it posts and I'd labelled as a follow-up rather than news. I could argue that one either way.

I also want to be upfront about one thing: I revised the prompt twice using those same headlines, so they aren't a clean test anymore. New posts are the real test.

## When Claude can't be reached

Workers Free allows 50 outside requests per run, and the bot already spends some of those on Reddit, NHL.com and Discord. So each scan asks Claude at most 15 times, and after one failed call it stops asking for the rest of that scan. An outage costs one timeout instead of fifteen.

A post that couldn't be read isn't marked as seen, so the next scan two minutes later tries it again. Anything older than six hours is still dropped, same as before. And \`/replay\` now tells you when Claude couldn't be reached, instead of just quietly skipping.

## The eval is the real test suite now

The unit tests use a fake Claude. The old regex wording tables moved into \`npm run eval\`, which runs about 730 labelled headlines through the real model and prints every wrong answer along with the model's one-line reason. Around 490 of them make it past the code checks, and a full run costs about 15 cents.

The one rule I gave myself is in a comment at the top of \`model.ts\`: don't touch the prompt without running the eval before and after. A fix for one wording can break three others. That's exactly what kept happening with the regexes, and the difference now is that I can see it.

Running it costs about $0.0002 per headline that reaches Claude, so well under a dollar a month.

## What's still not great

Nine real moves in the fresh set are still dropped, but by the code checks, not by the model. The AHL filter rejects two-way deals ("NHL: $850K. AHL: $100K"), and Friedman's "Connor Zary is on waivers today" doesn't name a team at all. The bot already keeps a roster cache, so mapping a player to their team is probably what I'll look at next.

Putting a model in the middle of the one thing this bot has to get right felt like a big step. Keeping its job small, and having hundreds of real headlines to check it against, made it a much smaller one.`,
  },
  {
    slug: 'kflare-v0-1-0',
    title: 'kflare v0.1.0 is out',
    excerpt:
      "Seven months after a weekend's notes, kflare has its first release: 19 kinds, each tested live against a real Cloudflare account. Notes on asking Cloudflare first, mutation testing, and opt-in adoption.",
    tags: ['Kubernetes', 'Go', 'Cloudflare'],
    publishedAt: '2026-10-23T00:32:00Z',
    contentMd: `In April I wrote about [starting kflare](/blog/building-kflare-kubernetes-operator-for-cloudflare) over a weekend: three resource kinds and a lot of notes about error handling. On Wednesday, [v0.1.0](https://github.com/JonathanGraniero/kflare/releases/tag/v0.1.0) went out. It's my first real release of something like this, so I wanted to write down where it ended up.

\`\`\`sh
helm install kflare oci://ghcr.io/jonathangraniero/charts/kflare \\
  --version 0.1.0 --namespace kflare-system --create-namespace
\`\`\`

It's up to 19 kinds now:

| Area | Kinds |
|---|---|
| Accounts | \`CloudflareAccount\` |
| DNS | \`Zone\`, \`DNSRecord\` |
| Tunnels | \`Tunnel\`, \`TunnelConfiguration\` |
| Workers and storage | \`WorkerScript\`, \`WorkerRoute\`, \`KVNamespace\`, \`R2Bucket\`, \`D1Database\` |
| Security | \`WAFCustomRule\`, \`RateLimitRule\`, \`ManagedRuleset\`, \`IPList\` |
| Rules | \`TransformRule\`, \`RedirectRule\`, \`CacheRule\`, \`ConfigurationRule\`, \`OriginRule\` |

The [quickstart](https://github.com/JonathanGraniero/kflare/blob/v0.1.0/README.md#quickstart-expose-a-service-through-a-cloudflare-tunnel) shows what I had in mind from the start. A \`DNSRecord\` can point at a \`Tunnel\` by name instead of a copied ID, so you can put a Service on the internet without a public IP or a load balancer, and the record follows the tunnel if it ever gets recreated.

## Most of the time went into finding out what Cloudflare does

Getting a controller working on the happy path took a day or two each time. Finding out what Cloudflare actually accepts, refuses and stores took a lot longer, and I think it's where most of the real work went.

So I got into the habit of asking Cloudflare first. Before the code relies on some behaviour, I probe it live and write down what happened. A few things that surprised me:

- It accepts a CNAME to a tunnel that doesn't exist.
- It refuses an empty KV namespace title, even though its own API spec doesn't set a minimum length.
- Two rule creates sent at the same time both land, so kflare can't assume it's the only one writing to a zone's rules.

All of that lives in \`ARCHITECTURE.md\` and the design notes, so the next time I wonder "why does it do it this way?" there's an answer with a date on it.

## Testing against a real account

Unit tests with fakes are where I started, and they're still most of the tests. But [the bug from the first post](/blog/building-kflare-kubernetes-operator-for-cloudflare) stuck with me: my fake didn't behave like the real thing, so my tests were just agreeing with themselves.

So every kind also runs against a real Cloudflare account on the Free plan, in GitHub Actions, and checks Cloudflare's copy after each step. The token it uses has exactly the permissions the deploy guide lists and nothing more. That turned out to be a nice side effect: if I forget a permission in the docs, CI fails.

The other thing I lean on is mutation testing. A small script injects deliberate bugs into a controller, one at a time, and the tests have to catch every one. A test that still passes against broken code doesn't count. It's the most direct answer I've found to "are these tests actually checking anything?"

## Adoption is opt-in

If you read my [adopt-or-create post](/blog/when-adopt-or-create-should-mean-upsert), you can probably guess how this one works. Nobody starts with an empty Cloudflare account, but an operator quietly taking over things it didn't create is scary. So kflare never touches an existing object unless the resource asks:

\`\`\`yaml
metadata:
  annotations:
    kflare.dev/adoption-policy: adopt-or-create
\`\`\`

Without it, the resource reports \`AlreadyExists\` and changes nothing. With it, kflare takes the object over and makes it match the spec, which is the upsert behaviour I wanted from ACK. The annotations are modelled on ACK's, on purpose. And an object kflare adopted is kept when its resource is deleted, because deleting something you didn't create is the one step you can't take back.

## What's not there yet

It's an alpha, the API is \`v1alpha1\`, and some fields will probably still change. The big gaps I know about:

- **Drift isn't corrected promptly.** A change someone makes in the dashboard gets fixed on the next reconcile, which can be up to 10 hours away.
- **No Kubernetes Events yet.** The \`Ready\` condition and the logs say what happened, but that's it.
- **Metrics are plain HTTP** inside the cluster, with no auth.

Those are next, more or less in that order. If you try it and something breaks, or the docs don't make sense, I'd genuinely like to hear about it. [Discussions](https://github.com/JonathanGraniero/kflare/discussions) is open.`,
  },
  {
    slug: 'generating-kflare-from-cloudflares-api-description',
    title: "Generating most of kflare from Cloudflare's own API description",
    excerpt:
      "Every kflare kind but one now comes out of a code generator built on Cloudflare's Go SDK and OpenAPI spec. Why I did it, what I borrowed from ACK, and the breaking changes it took.",
    tags: ['Kubernetes', 'Go', 'Cloudflare'],
    publishedAt: '2026-11-01T19:05:00Z',
    contentMd: `The [first kflare post](/blog/building-kflare-kubernetes-operator-for-cloudflare) ended with "eventually I'd like to generate most of this from Cloudflare's OpenAPI spec instead of writing each resource by hand." With v0.4.0 yesterday, that's more or less true: every kind except \`CloudflareAccount\` now comes out of a generator I've been calling kflare-gen. It took longer than I thought and broke more manifests than I'd like, so here's how it went.

## Why bother

Most of a new kind turned out to be the same wiring every time. When I added \`IPList\` by hand, the PR touched 27 files and added about 2,600 lines. Only a small part of that was about IP lists. The rest was the same things every kind needs: condition getters, registering the controller, the CRD kustomization, the Helm \`edit\` role, watching the account, a narrow API interface, and the same lifecycle tests (finalizer, account not ready, invalid token, create, adopt, conflict, recreate, retain, failed deletes retried...).

Copying that by hand for every kind, they slowly drifted apart in small ways, like one kind reporting a conflict a little differently than another. A generator makes them all the same on purpose.

## Two sources, and neither is enough alone

Cloudflare's Go SDK v7 is itself generated from their API description, and every package has an \`api.md\` that maps each method to its verb and route:

\`\`\`
post /accounts/{account_id}/storage/kv/namespaces → client.KV.Namespaces.New
\`\`\`

Between that and the Go types, I get the fields, which ones are required, and the enums. What I don't get is any of the validation: lengths, patterns, ranges, defaults.

The OpenAPI spec has those, but it's 27 MB and 2,339 paths. So kflare-gen has a \`sync-spec\` step that copies just the operations and schemas kflare uses, from a pinned commit, into the repo. Codegen only reads that subset, so it runs offline, and if Cloudflare tightens a constraint it shows up as a diff in review. The SDK decides which fields exist, and the spec only adds constraints on top.

And neither one is always the live API. The spec's pattern for IP list names allows uppercase letters, and Cloudflare refuses them. So an entry can override a validation, but it has to say why.

## Borrowing from ACK

Having spent some time in ACK's code generator for my [Glue PR](/blog/adding-a-database-resource-to-the-ack-glue-controller), I mostly copied its shape: a YAML entry per kind plus the SDK's model, generating code that runs on a shared runtime. Here's part of the entry for \`KVNamespace\`:

\`\`\`yaml
- kind: KVNamespace
  service: kv.NamespaceService
  scope: account
  claimLabel: kflare.dev/kv-namespace-id
  adopt:
    by: title
  fields:
    title:
      printColumn: Title
      validation:
        minLength: 1
        maxLength: 512
        reason: >-
          The spec gives no minimum, and Cloudflare refuses an empty title
          (10019, "title is required"; verified live 2026-10-14).
  ignore:
    supports_url_encoding: Not observed by the controller yet.
\`\`\`

I did change two things from ACK. Hooks are plain Go functions instead of templates, which I find a lot easier to read and test. And the API's defaults become the CRD's defaults, so a resource's spec and Cloudflare's copy can be compared directly, without the controller filling in fields after the fact.

Fields are opt-out, too. A generated kind gets every field the SDK exposes unless its entry ignores it, with a reason. Since the generated code is committed, an SDK bump that adds a field shows up in the PR. That's the lesson from the Glue PR, where a generated diff I didn't expect turned out to be a real problem: I'd rather see it than not.

## The breaking part

The generator started with KV, D1 and the Rules products, and for a while the older, hand-written kinds lived next to them. That was the part that bugged me. Two ways of doing everything is how the drift started in the first place.

So I decided to move every kind over, even though it meant breaking changes. Generated fields take the API's names, so in v0.3.0 a \`ManagedRuleset\`'s \`rulesetID\` became \`id\`, and a \`RateLimitRule\`'s settings moved under \`ratelimit\`, the way Cloudflare names them. Every change is in the changelog with a manifest before and after. Breaking things is never great, but doing it all at once, while kflare is still an alpha, felt a lot better than doing it a little at a time later.

v0.4.0 finished it: \`DNSRecord\`, \`Tunnel\` and \`IPList\` moved over too, and now every kind but \`CloudflareAccount\` adopts, reports conflicts and deletes objects the same way. As a nice bonus, a \`Tunnel\` can finally be renamed, which the old SDK couldn't do.

## What stays hand-written

Whatever Cloudflare doesn't describe. Behaviour I checked live goes into the kind's entry as a validation, a CEL rule or an ignore with a reason. Logic an entry can't express goes into a small hand-written hooks file next to the generated code. \`Zone\`, \`TunnelConfiguration\` and \`WorkerScript\` still keep a few hand-written fields on the older SDK, so there's a bit left to do.

The part I like most is what adding a kind looks like now: mostly a YAML entry, plus whatever Cloudflare does that isn't in its docs. Zone settings, Queues and Turnstile are the next ones I'd like to try it on.`,
  },
  {
    slug: 'sharing-cloudflares-rate-limit-across-accounts',
    title: 'Sharing one Cloudflare rate limit across a lot of accounts',
    excerpt:
      "How kflare keeps each API token under Cloudflare's limit, why waiting out a 429 would have stalled every other account, and why a rate limit shouldn't turn anything not-ready.",
    tags: ['Kubernetes', 'Go', 'Cloudflare'],
    publishedAt: '2026-11-06T01:18:00Z',
    contentMd: `For most of its life, kflare didn't really think about Cloudflare's rate limit. Each reconcile had a little limiter of its own, and that was fine for one cluster talking to one account with a few dozen resources.

But a setup I want kflare to handle well is one management cluster serving a lot of Cloudflare accounts. And in that setup, the old approach had a pretty bad failure mode: one account hitting its limit could stall every other account the operator manages. [v0.4.2](https://github.com/JonathanGraniero/kflare/releases/tag/v0.4.2), out on Wednesday, fixes that. This is how it works now, and the part I almost got wrong.

## What Cloudflare actually counts

Cloudflare allows 1,200 API calls per five minutes, and past that it refuses everything for five minutes. The important detail is *what* it counts per: a user (across their dashboard sessions, API keys and tokens), or an account-owned token. Not a Cloudflare account.

My first instinct was a budget per account, since that's how kflare models things. But a user's token can reach several accounts. With a budget per account, a token that reaches five accounts would happily send five times the limit. So the budget is per token instead.

The nice part is that nothing has to pass the token around for this. Both of Cloudflare's Go SDKs send through one shared HTTP client, so a transport on that client reads the token from each request's \`Authorization\` header and keeps a token bucket per token, keyed by a hash of it. Accounts that share a token share its budget. A rotated token just gets a new one.

By default that's 900 requests per five minutes, a bit under Cloudflare's 1,200, which leaves some room for whatever else uses the token. If Cloudflare raised your limit, there's a chart value for it, or \`spec.rateLimit\` on a single account, since an organization can have accounts on different plans.

## The part I almost got wrong

The obvious way to handle a 429 is to wait it out: hold the request in the transport until Cloudflare's block is over, then send it. That's what the issue originally proposed, and it sounds reasonable.

The problem is that each kind's controller runs one worker by default. If that worker is asleep inside a reconcile waiting out a five-minute block for account A, every \`DNSRecord\` in accounts B through Z waits too. A rate limit on one account turns into an outage for all of them.

So instead, the transport refuses anything that would wait more than 10 seconds, and every reconcile asks first, before it makes any calls. If its token is held or out of budget, the reconcile steps aside with a \`RequeueAfter\`, and the worker moves on to the next resource, which may well belong to another account.

The Go SDK made this a bit sneakier than I expected. When v7 gets a 429, it sleeps for the whole \`Retry-After\` inside the call before retrying. So kflare marks those 429s with \`x-should-retry: false\` on the way back, to stop the SDK sleeping through it.

## Changes before checks

There's one more piece I like a lot. After a restart, kflare re-checks every resource, and with a few thousand resources that's a big backlog against the budget. If someone applies a real change during that, it shouldn't wait behind thousands of routine checks.

So resources that are already in sync and only need checking take turns separately from resources with a change to make, and checks only go ahead when no change is waiting. The workqueue's own priorities couldn't do this, because an item that's waiting for budget leaves the queue right away and comes back later.

## A rate limit isn't a failure

The last change is about status. A rate limit says nothing about a resource, and it can touch thousands of them at once. So a resource that was \`Ready\` stays \`Ready\`, with no event. That matters most for a \`CloudflareAccount\`, because if it went not-ready, everything using it would stop. Anything that wasn't ready yet reports a new reason, \`RateLimited\`, once, and there are two new metrics to alert on instead of a wall of \`APIError\`s.

## How I tested it, and what I couldn't

The transport's tests run in Go's \`testing/synctest\`, so a five-minute hold takes no real time and the timings are exact. There's a spec with a real manager and two accounts: a backlog of 25 resources on a held account, and one resource on the other account that goes \`Synced\` while the backlog makes no calls at all. Mutation testing caught all 70 mutations in the end, but three survived at first, and each one pointed at a gap I then covered.

What I didn't do is provoke a real 429 from Cloudflare. That would block the test account's real dashboard and Workers for five minutes. So what a 429 carries comes from Cloudflare's docs, and if \`Retry-After\` is ever missing, kflare just holds for the full five minutes. I'd rather be honest that this part is going off the docs.

If you're running kflare across a lot of accounts, I'd really like to hear how this behaves for you.`,
  },
  {
    slug: 'renaming-a-resource-shouldnt-delete-your-dns-record',
    title: "Renaming a resource shouldn't delete your DNS record",
    excerpt:
      'A kustomize prefix or a Helm rename looks like a delete plus a create. Since v0.4.3, kflare hands the Cloudflare object to the new resource instead of deleting it and making it again.',
    tags: ['Kubernetes', 'Go', 'Cloudflare'],
    publishedAt: '2026-11-13T00:41:00Z',
    contentMd: `Here's a thing that's easy to do by accident in Kubernetes: rename a resource. Add a kustomize \`namePrefix\`, change a Helm \`fullnameOverride\`, refactor a cdk8s construct, and to the API server it looks like one resource was deleted and a brand-new one was created.

For most things that's fine. For an operator that manages something outside the cluster, it isn't. Until [v0.4.3](https://github.com/JonathanGraniero/kflare/releases/tag/v0.4.3) yesterday, renaming a kflare \`DNSRecord\` deleted the DNS record with the old resource and created it again for the new one, up to a minute later. A tunnel got a new ID and token. And a renamed \`KVNamespace\` or \`D1Database\` lost its data, which is the worst of the three.

## The name isn't the identity

What made this fixable is that a resource's \`metadata.name\` isn't what names its Cloudflare object. The \`spec.name\`, a KV namespace's title or a route's pattern does. So a rename is a new resource with the exact same spec as the old one, followed by the old one's deletion. It describes no change in Cloudflare at all, and kflare shouldn't make one.

Before this, the new resource would show up, find the object already managed by the old one, and report a conflict. Then the old one was deleted, took the object with it, and the new one created it again on its next try.

## Handing it off

Now, when a resource is about to delete its object, kflare first looks for a successor: another resource of the same kind that

- is in the same namespace, and isn't being deleted itself,
- describes the same object (same key, and for a \`DNSRecord\` the same name, type and content, since a name alone doesn't tell the members of a record set apart),
- points at the same Cloudflare account or zone,
- and doesn't already manage something else.

If there is one, kflare writes the object's ID into the successor's claim label and removes the old resource's finalizer, without a single call to Cloudflare. The object keeps its ID, and the new resource goes \`Ready\` within seconds. Both resources get an Event with reason \`HandedOff\`, so you can see it happened.

The order matters here. The claim is written before the finalizer goes, so the object always has an owner. If the hand-off fails halfway, it just happens again on the next try.

The new resource inherits what the old one knew, too. An object kflare created is still deleted with the successor later, and an object it adopted is still kept. The old resource's deletion policy doesn't apply, even \`delete\`, since the successor's spec is clearly asking for the object.

## What isn't handed off

A few things deliberately aren't:

- **Another namespace.** A resource in another namespace might belong to someone else, and deleting your resource shouldn't hand them your object.
- **\`Zone\`.** Two \`Zone\` resources can point at the same Cloudflare zone, so there's no single owner to hand it to. The deploy guide has the steps for renaming one with the retain policy.
- **The rule kinds.** A rule's identity in Cloudflare comes from its resource's name, so a rename writes the new rule before the old one goes. There's an overlap, not a gap, which is the safer direction anyway.

## Argo CD goes the other way

The hand-off covers renames where the new resource is created before the old one is deleted. Argo CD prunes before it applies, though. So with Argo CD, the old resource is gone before its successor exists, and the record still gets deleted and recreated. Resolvers that ask in between would cache the missing record for the zone's negative TTL, which is exactly what I wanted to avoid.

That's what I'm working on now: a short grace period, 30 seconds by default, where a deleted resource with no successor holds on to its object and waits for one to show up. Each controller watches for new resources of its kind, so the hand-off happens as soon as the successor is created, not when the wait runs out. The trade-off is that every deletion that really does delete an object takes a little longer, so it's a setting, and \`0s\` turns it off.

Renaming things is such a normal part of working in a GitOps repo, and a DNS record briefly vanishing is the kind of failure you'd probably only notice in production. So I'm really glad this one is handled now.`,
  },
];
