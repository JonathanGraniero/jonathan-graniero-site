import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.ts';
import { PostsService } from './posts.service.ts';

type Mocked<T> = { [K in keyof T]: jest.Mock };

function makePrisma() {
  const post: Mocked<
    Pick<
      PrismaService['post'],
      'findMany' | 'findFirst' | 'findUnique' | 'create' | 'update' | 'delete' | 'count'
    >
  > = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
  return { post, $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)) };
}

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  slug: 'hello',
  title: 'Hello',
  excerpt: 'e',
  contentMd: 'body',
  coverImage: null,
  status: 'PUBLISHED',
  publishedAt: new Date('2026-01-01T00:00:00Z'),
  readingTimeMin: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  tags: [{ id: 't1', slug: 'go', name: 'Go' }],
  ...overrides,
});

describe('PostsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: PostsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PostsService(prisma as unknown as PrismaService);
  });

  describe('searchTerms', () => {
    it('builds a prefix tsquery from free text', () => {
      expect(PostsService.searchTerms('Kube contr')).toBe('kube:* & contr:*');
    });
    it('strips tsquery operators so user input cannot alter the query', () => {
      expect(PostsService.searchTerms("a & b | !c:* ')")).toBe('a:* & b:* & c:*');
    });
    it('returns null for empty or symbol-only input', () => {
      expect(PostsService.searchTerms(undefined)).toBeNull();
      expect(PostsService.searchTerms('  !! ')).toBeNull();
    });
  });

  describe('listPublished', () => {
    it('filters by status and tag and returns pagination metadata', async () => {
      prisma.post.count.mockResolvedValue(11);
      prisma.post.findMany.mockResolvedValue([row()]);

      const page = await service.listPublished({ page: 2, pageSize: 5, tag: 'go' });

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PUBLISHED', tags: { some: { slug: 'go' } } },
          skip: 5,
          take: 5,
        }),
      );
      expect(page).toMatchObject({ total: 11, page: 2, pageSize: 5, totalPages: 3 });
      expect(page.items[0]).toMatchObject({
        slug: 'hello',
        publishedAt: '2026-01-01T00:00:00.000Z',
        tags: [{ slug: 'go', name: 'Go' }],
      });
    });
  });

  describe('getPublishedBySlug', () => {
    it('throws NotFound for missing posts', async () => {
      prisma.post.findFirst.mockResolvedValue(null);
      await expect(service.getPublishedBySlug('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('includes previous/next neighbours', async () => {
      prisma.post.findFirst
        .mockResolvedValueOnce(row())
        .mockResolvedValueOnce({ slug: 'older', title: 'Older' })
        .mockResolvedValueOnce(null);
      const post = await service.getPublishedBySlug('hello');
      expect(post.previous).toEqual({ slug: 'older', title: 'Older' });
      expect(post.next).toBeNull();
    });
  });

  describe('create', () => {
    it('generates a unique slug, dedupes tags and stamps publishedAt when published', async () => {
      prisma.post.findMany.mockResolvedValue([{ slug: 'my-post' }, { slug: 'my-post-2' }]);
      prisma.post.create.mockImplementation(({ data }) =>
        Promise.resolve(row({ ...data, tags: [] })),
      );

      await service.create({
        title: 'My Post',
        excerpt: 'e',
        contentMd: 'body',
        status: 'PUBLISHED',
        tags: ['Go', ' go ', 'Kubernetes'],
      });

      const { data } = prisma.post.create.mock.calls[0][0];
      expect(data.slug).toBe('my-post-3');
      expect(data.publishedAt).toBeInstanceOf(Date);
      expect(
        data.tags.connectOrCreate.map((t: { where: { slug: string } }) => t.where.slug),
      ).toEqual(['go', 'kubernetes']);
    });

    it('defaults to draft with no publish date', async () => {
      prisma.post.findMany.mockResolvedValue([]);
      prisma.post.create.mockImplementation(({ data }) =>
        Promise.resolve(row({ ...data, tags: [] })),
      );
      await service.create({ title: 'Draft', excerpt: 'e', contentMd: 'b' });
      const { data } = prisma.post.create.mock.calls[0][0];
      expect(data).toMatchObject({ slug: 'draft', status: 'DRAFT', publishedAt: null });
    });
  });

  describe('update', () => {
    it('keeps the original publish date when re-publishing', async () => {
      const original = new Date('2025-06-01');
      prisma.post.findUnique.mockResolvedValue(row({ publishedAt: original }));
      prisma.post.update.mockResolvedValue(row());
      await service.update('p1', { status: 'PUBLISHED' });
      expect(prisma.post.update.mock.calls[0][0].data.publishedAt).toBeUndefined();
    });

    it('clears the publish date when unpublishing', async () => {
      prisma.post.findUnique.mockResolvedValue(row());
      prisma.post.update.mockResolvedValue(row({ status: 'DRAFT', publishedAt: null }));
      await service.update('p1', { status: 'DRAFT' });
      expect(prisma.post.update.mock.calls[0][0].data.publishedAt).toBeNull();
    });

    it('replaces tags and recomputes reading time', async () => {
      prisma.post.findUnique.mockResolvedValue(row());
      prisma.post.update.mockResolvedValue(row());
      await service.update('p1', { contentMd: 'new body', tags: ['Rust'] });
      const { data } = prisma.post.update.mock.calls[0][0];
      expect(data.tags.set).toEqual([]);
      expect(data.readingTimeMin).toBe(1);
    });

    it('throws NotFound for unknown ids', async () => {
      prisma.post.findUnique.mockResolvedValue(null);
      await expect(service.update('x', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
