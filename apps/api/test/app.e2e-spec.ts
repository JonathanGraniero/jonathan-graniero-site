/**
 * End-to-end tests against a real Postgres (the `db-test` compose service).
 * Run with `npm run test:e2e`, which resets the schema first.
 */
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { Paginated, PostDetail, PostSummary } from '@site/shared';
import { AppModule } from '../src/app.module.ts';
import { configureApp } from '../src/app.setup.ts';
import { PrismaService } from '../src/prisma/prisma.service.ts';

const ADMIN = { email: 'admin@test.local', password: 'test-password-123' };

describe('API (e2e)', () => {
  let app: NestExpressApplication;
  let http: App;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    http = app.getHttpServer();
    prisma = app.get(PrismaService);
    await resetTestDatabase(prisma);
    await seed(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('public content', () => {
    it('GET /api/health/live answers without touching the database', async () => {
      await request(http).get('/api/health/live').expect(200, { status: 'ok' });
    });

    it('GET /api/health reports the database as up', async () => {
      const res = await request(http).get('/api/health').expect(200);
      expect(res.body.info.database.status).toBe('up');
    });

    it('GET /api/posts paginates published posts newest first and hides drafts', async () => {
      const res = await request(http).get('/api/posts?pageSize=2').expect(200);
      const body = res.body as Paginated<PostSummary>;
      expect(body).toMatchObject({ total: 3, page: 1, pageSize: 2, totalPages: 2 });
      expect(body.items.map((p) => p.slug)).toEqual(['third', 'second']);
      expect(res.headers['cache-control']).toContain('public');
      expect(res.headers.etag).toBeDefined();
    });

    it('supports tag filtering', async () => {
      const res = await request(http).get('/api/posts?tag=go').expect(200);
      expect(res.body.items.map((p: PostSummary) => p.slug)).toEqual(['third', 'first']);
    });

    it('supports prefix full-text search combined with tags', async () => {
      const search = await request(http).get('/api/posts?q=reconcil').expect(200);
      expect(search.body.items.map((p: PostSummary) => p.slug)).toEqual(['first']);

      const none = await request(http).get('/api/posts?q=reconcil&tag=typescript').expect(200);
      expect(none.body.total).toBe(0);
    });

    it('never matches drafts in search', async () => {
      const res = await request(http).get('/api/posts?q=secret').expect(200);
      expect(res.body.total).toBe(0);
    });

    it('GET /api/posts/:slug returns detail with neighbours', async () => {
      const res = await request(http).get('/api/posts/second').expect(200);
      const post = res.body as PostDetail;
      expect(post.contentMd).toContain('Second body');
      expect(post.previous?.slug).toBe('first');
      expect(post.next?.slug).toBe('third');
    });

    it('404s for drafts and unknown slugs', async () => {
      await request(http).get('/api/posts/draft-post').expect(404);
      const res = await request(http).get('/api/posts/nope').expect(404);
      expect(res.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        path: '/api/posts/nope',
      });
    });

    it('rejects invalid and unknown query params', async () => {
      const res = await request(http).get('/api/posts?pageSize=999&evil=1').expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'property evil should not exist',
          'pageSize must not be greater than 50',
        ]),
      );
    });

    it('GET /api/tags only counts published posts', async () => {
      const res = await request(http).get('/api/tags').expect(200);
      expect(res.body).toEqual([
        { slug: 'go', name: 'Go', postCount: 2 },
        { slug: 'typescript', name: 'TypeScript', postCount: 1 },
      ]);
    });

    it('serves profile and career data', async () => {
      const profile = await request(http).get('/api/profile').expect(200);
      expect(profile.body).toMatchObject({
        name: 'Test Person',
        social: { github: 'https://github.com/test' },
      });
      const projects = await request(http).get('/api/projects?featured=true').expect(200);
      expect(projects.body).toHaveLength(1);
    });

    it('serves RSS and sitemap XML', async () => {
      const rss = await request(http).get('/api/rss.xml').expect(200);
      expect(rss.headers['content-type']).toContain('application/rss+xml');
      expect(rss.text).toContain('<link>http://localhost:5173/blog/third</link>');
      expect(rss.text).not.toContain('draft-post');

      const sitemap = await request(http).get('/api/sitemap.xml').expect(200);
      expect(sitemap.text).toContain('<loc>http://localhost:5173/blog/first</loc>');
    });
  });

  describe('auth & admin', () => {
    it('rejects admin routes without a session', async () => {
      await request(http).get('/api/admin/posts').expect(401);
      await request(http).post('/api/admin/posts').send({}).expect(401);
      await request(http).get('/api/auth/me').expect(401);
    });

    it('rejects forged tokens', async () => {
      await request(http).get('/api/auth/me').set('Authorization', 'Bearer not.a.jwt').expect(401);
    });

    it('rejects bad credentials with a generic message', async () => {
      const res = await request(http)
        .post('/api/auth/login')
        .send({ email: ADMIN.email, password: 'wrong-password' })
        .expect(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('supports the full post lifecycle for a signed-in admin', async () => {
      const agent = request.agent(http);
      const login = await agent.post('/api/auth/login').send(ADMIN).expect(200);
      expect(login.headers['set-cookie']?.[0]).toMatch(/access_token=.*HttpOnly/);
      const me = await agent.get('/api/auth/me').expect(200);
      expect(me.body).toEqual({ id: expect.any(String), email: ADMIN.email });

      // Create a draft
      const created = await agent
        .post('/api/admin/posts')
        .send({
          title: 'Brand New Post',
          excerpt: 'x',
          contentMd: 'Hello **world**',
          tags: ['Rust', 'rust'],
        })
        .expect(201);
      expect(created.body).toMatchObject({
        slug: 'brand-new-post',
        status: 'DRAFT',
        publishedAt: null,
      });
      expect(created.body.tags).toEqual([{ slug: 'rust', name: 'Rust' }]);
      expect(created.headers['cache-control']).toBe('no-store');
      await request(http).get('/api/posts/brand-new-post').expect(404);

      // Validation
      await agent.post('/api/admin/posts').send({ title: '' }).expect(400);

      // Slug conflicts surface as 409
      const conflict = await agent
        .post('/api/admin/posts')
        .send({ title: 'x', slug: 'first', excerpt: 'x', contentMd: 'x' })
        .expect(409);
      expect(conflict.body.message).toBe('A record with this slug already exists');

      // Publish -> visible publicly
      const id = created.body.id as string;
      const published = await agent
        .patch(`/api/admin/posts/${id}`)
        .send({ status: 'PUBLISHED' })
        .expect(200);
      expect(published.body.publishedAt).not.toBeNull();
      await request(http).get('/api/posts/brand-new-post').expect(200);

      // Admin list includes drafts
      const drafts = await agent.get('/api/admin/posts?status=DRAFT').expect(200);
      expect(drafts.body.items.map((p: PostSummary) => p.slug)).toEqual(['draft-post']);

      // Delete
      await agent.delete(`/api/admin/posts/${id}`).expect(204);
      await agent.delete(`/api/admin/posts/${id}`).expect(404);

      // Logout clears the session
      await agent.post('/api/auth/logout').expect(204);
      await agent.get('/api/auth/me').expect(401);
    });

    it('lets the admin update the profile', async () => {
      const agent = request.agent(http);
      await agent.post('/api/auth/login').send(ADMIN).expect(200);
      const res = await agent
        .patch('/api/admin/profile')
        .send({ headline: 'Updated headline', social: { website: 'https://example.com' } })
        .expect(200);
      expect(res.body).toMatchObject({
        headline: 'Updated headline',
        social: { website: 'https://example.com' },
      });
    });
  });

  describe('contact', () => {
    const message = {
      name: 'Visitor',
      email: 'Visitor@Example.com',
      message: 'Hello, great blog posts!',
    };

    it('validates input', async () => {
      const res = await request(http)
        .post('/api/contact')
        .send({ name: 'x', email: 'nope', message: 'short' })
        .expect(400);
      expect(res.body.message).toEqual(expect.arrayContaining(['email must be an email']));
    });

    it('stores messages, drops honeypot submissions, and rate-limits', async () => {
      const before = await prisma.contactMessage.count();

      await request(http).post('/api/contact').send(message).expect(201);
      await request(http)
        .post('/api/contact')
        .send({ ...message, website: 'http://spam' })
        .expect(201);
      // The validation failure above counts too: this is the 4th request in the window.
      await request(http).post('/api/contact').send(message).expect(429);

      expect(await prisma.contactMessage.count()).toBe(before + 1);
      const saved = await prisma.contactMessage.findFirst({ orderBy: { createdAt: 'desc' } });
      expect(saved?.email).toBe('visitor@example.com');
    });
  });

  describe('admin inbox', () => {
    it('requires a session', async () => {
      await request(http).get('/api/admin/messages').expect(401);
      await request(http).get('/api/admin/messages/stats').expect(401);
    });

    it('lists, marks read/unread and deletes messages', async () => {
      const seeded = await prisma.contactMessage.create({
        data: {
          name: 'Inbox Test',
          email: 'inbox@example.com',
          message: 'Hi from the e2e suite',
          ip: '198.51.100.7',
          userAgent: 'jest',
        },
      });
      const agent = request.agent(http);
      await agent.post('/api/auth/login').send(ADMIN).expect(200);

      const before = (await agent.get('/api/admin/messages/stats').expect(200)).body;
      expect(before.unread).toBeGreaterThanOrEqual(1);

      const unread = await agent.get('/api/admin/messages?unread=true').expect(200);
      const listed = unread.body.items.find((m: { id: string }) => m.id === seeded.id);
      expect(listed).toMatchObject({
        name: 'Inbox Test',
        email: 'inbox@example.com',
        readAt: null,
      });
      expect(listed).not.toHaveProperty('ip'); // sender metadata stays server-side
      expect(listed).not.toHaveProperty('userAgent');
      expect(unread.headers['cache-control']).toBe('no-store');

      const read = await agent
        .patch(`/api/admin/messages/${seeded.id}`)
        .send({ read: true })
        .expect(200);
      expect(read.body.readAt).not.toBeNull();
      const after = (await agent.get('/api/admin/messages/stats').expect(200)).body;
      expect(after.unread).toBe(before.unread - 1);
      const stillUnread = await agent.get('/api/admin/messages?unread=true').expect(200);
      expect(stillUnread.body.items.map((m: { id: string }) => m.id)).not.toContain(seeded.id);

      // Re-marking read keeps the original read time.
      const again = await agent
        .patch(`/api/admin/messages/${seeded.id}`)
        .send({ read: true })
        .expect(200);
      expect(again.body.readAt).toBe(read.body.readAt);

      const unmarked = await agent
        .patch(`/api/admin/messages/${seeded.id}`)
        .send({ read: false })
        .expect(200);
      expect(unmarked.body.readAt).toBeNull();

      await agent.patch(`/api/admin/messages/${seeded.id}`).send({ read: 'yes' }).expect(400);
      await agent.delete(`/api/admin/messages/${seeded.id}`).expect(204);
      await agent.delete(`/api/admin/messages/${seeded.id}`).expect(404);
      await agent.patch(`/api/admin/messages/${seeded.id}`).send({ read: true }).expect(404);
    });
  });
});

/**
 * Empties every table so each run starts clean. Refuses to run unless this is
 * unmistakably the test database.
 */
async function resetTestDatabase(prisma: PrismaService): Promise<void> {
  const dbName = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1);
  if (process.env.NODE_ENV !== 'test' || !dbName.endsWith('_test')) {
    throw new Error(`Refusing to reset database "${dbName}" outside NODE_ENV=test / *_test`);
  }
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

async function seed(prisma: PrismaService): Promise<void> {
  await prisma.adminUser.create({
    data: { email: ADMIN.email, passwordHash: await argon2.hash(ADMIN.password) },
  });
  await prisma.profile.create({
    data: {
      id: 1,
      name: 'Test Person',
      headline: 'Tester',
      bio: 'Bio',
      location: 'Earth',
      github: 'https://github.com/test',
    },
  });
  await prisma.project.createMany({
    data: [
      { name: 'Featured', description: 'd', tech: ['Go'], featured: true },
      { name: 'Other', description: 'd', tech: [], featured: false },
    ],
  });

  const tag = (name: string) => ({
    where: { slug: name.toLowerCase() },
    create: { slug: name.toLowerCase(), name },
  });
  const posts = [
    {
      slug: 'first',
      title: 'First',
      body: 'Writing a reconcile loop',
      date: '2026-01-01',
      tags: ['Go'],
    },
    {
      slug: 'second',
      title: 'Second',
      body: 'Second body',
      date: '2026-02-01',
      tags: ['TypeScript'],
    },
    { slug: 'third', title: 'Third', body: 'Third body', date: '2026-03-01', tags: ['Go'] },
  ];
  for (const p of posts) {
    await prisma.post.create({
      data: {
        slug: p.slug,
        title: p.title,
        excerpt: `${p.title} excerpt`,
        contentMd: p.body,
        status: 'PUBLISHED',
        publishedAt: new Date(p.date),
        tags: { connectOrCreate: p.tags.map(tag) },
      },
    });
  }
  await prisma.post.create({
    data: {
      slug: 'draft-post',
      title: 'Draft',
      excerpt: 'Not yet',
      contentMd: 'A secret draft',
      status: 'DRAFT',
      tags: { connectOrCreate: [tag('Draftonly')] },
    },
  });
}
