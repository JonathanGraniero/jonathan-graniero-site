import { Injectable, NotFoundException } from '@nestjs/common';
import type { Paginated, PostDetail, PostStatus, PostSummary } from '@site/shared';
import { Prisma } from '../generated/prisma/client.ts';
import { PrismaService } from '../prisma/prisma.service.ts';
import { toPage } from '../common/utils/paginate.ts';
import { readingTimeMinutes, slugify } from '../common/utils/text.ts';
import type { CreatePostDto, UpdatePostDto } from './dto/post-input.dto.ts';
import type { AdminPostListQueryDto, PostListQueryDto } from './dto/post-query.dto.ts';
import { postInclude, toPostDetail, toPostSummary } from './posts.mapper.ts';

/** Must match the expression index in the `post_search` migration exactly. */
const SEARCH_VECTOR = Prisma.sql`to_tsvector('english', p."title" || ' ' || p."excerpt" || ' ' || p."contentMd")`;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Public reads ----------

  listPublished(query: PostListQueryDto): Promise<Paginated<PostSummary>> {
    return this.list(query, 'PUBLISHED');
  }

  async getPublishedBySlug(slug: string): Promise<PostDetail> {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: postInclude,
    });
    if (!post?.publishedAt) {
      throw new NotFoundException(`Post "${slug}" not found`);
    }

    const select = { slug: true, title: true } as const;
    const [previous, next] = await Promise.all([
      this.prisma.post.findFirst({
        where: { status: 'PUBLISHED', publishedAt: { lt: post.publishedAt } },
        orderBy: { publishedAt: 'desc' },
        select,
      }),
      this.prisma.post.findFirst({
        where: { status: 'PUBLISHED', publishedAt: { gt: post.publishedAt } },
        orderBy: { publishedAt: 'asc' },
        select,
      }),
    ]);
    return toPostDetail(post, { previous, next });
  }

  // ---------- Admin ----------

  listAll(query: AdminPostListQueryDto): Promise<Paginated<PostSummary>> {
    return this.list(query, query.status);
  }

  async getById(id: string): Promise<PostDetail> {
    const post = await this.prisma.post.findUnique({ where: { id }, include: postInclude });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    return toPostDetail(post);
  }

  async create(dto: CreatePostDto): Promise<PostDetail> {
    const status = dto.status ?? 'DRAFT';
    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        slug: dto.slug ?? (await this.uniqueSlug(dto.title)),
        excerpt: dto.excerpt,
        contentMd: dto.contentMd,
        coverImage: dto.coverImage ?? null,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        readingTimeMin: readingTimeMinutes(dto.contentMd),
        tags: { connectOrCreate: this.tagConnections(dto.tags ?? []) },
      },
      include: postInclude,
    });
    return toPostDetail(post);
  }

  async update(id: string, dto: UpdatePostDto): Promise<PostDetail> {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Post ${id} not found`);

    const data: Prisma.PostUpdateInput = {
      title: dto.title,
      slug: dto.slug,
      excerpt: dto.excerpt,
      coverImage: dto.coverImage,
      status: dto.status,
    };
    if (dto.contentMd !== undefined) {
      data.contentMd = dto.contentMd;
      data.readingTimeMin = readingTimeMinutes(dto.contentMd);
    }
    if (dto.status === 'PUBLISHED' && !existing.publishedAt) {
      data.publishedAt = new Date();
    } else if (dto.status === 'DRAFT') {
      data.publishedAt = null;
    }
    if (dto.tags) {
      data.tags = { set: [], connectOrCreate: this.tagConnections(dto.tags) };
    }

    const post = await this.prisma.post.update({ where: { id }, data, include: postInclude });
    return toPostDetail(post);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.post.delete({ where: { id } });
  }

  // ---------- Internals ----------

  private async list(
    query: PostListQueryDto,
    status: PostStatus | undefined,
  ): Promise<Paginated<PostSummary>> {
    const { page, pageSize, tag } = query;
    const terms = PostsService.searchTerms(query.q);
    if (terms) return this.search(terms, { page, pageSize, tag, status });

    const where: Prisma.PostWhereInput = {
      status,
      tags: tag ? { some: { slug: tag } } : undefined,
    };
    const [total, posts] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        include: postInclude,
        orderBy: [{ publishedAt: { sort: 'desc', nulls: 'first' } }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return toPage(posts.map(toPostSummary), total, page, pageSize);
  }

  /**
   * Ranked Postgres full-text search. Each term is prefix-matched so partial
   * input ("nes" → "nestjs") works for search-as-you-type.
   */
  private async search(
    tsquery: string,
    opts: { page: number; pageSize: number; tag?: string; status?: PostStatus },
  ): Promise<Paginated<PostSummary>> {
    const filters = [Prisma.sql`${SEARCH_VECTOR} @@ to_tsquery('english', ${tsquery})`];
    if (opts.status) {
      filters.push(Prisma.sql`p."status" = ${opts.status}::"PostStatus"`);
    }
    if (opts.tag) {
      filters.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "_PostToTag" pt JOIN "Tag" t ON t."id" = pt."B"
        WHERE pt."A" = p."id" AND t."slug" = ${opts.tag})`);
    }
    const where = Prisma.join(filters, ' AND ');

    const [countRows, idRows] = await Promise.all([
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM "Post" p WHERE ${where}`,
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT p."id" FROM "Post" p WHERE ${where}
        ORDER BY ts_rank(${SEARCH_VECTOR}, to_tsquery('english', ${tsquery})) DESC,
                 p."publishedAt" DESC NULLS LAST
        LIMIT ${opts.pageSize} OFFSET ${(opts.page - 1) * opts.pageSize}`,
    ]);

    const ids = idRows.map((r) => r.id);
    const posts = await this.prisma.post.findMany({
      where: { id: { in: ids } },
      include: postInclude,
    });
    const byId = new Map(posts.map((p) => [p.id, p]));
    const ordered = ids.flatMap((id) => byId.get(id) ?? []);
    return toPage(
      ordered.map(toPostSummary),
      Number(countRows[0]?.count ?? 0),
      opts.page,
      opts.pageSize,
    );
  }

  /** Turns free text into a safe prefix tsquery (`foo:* & bar:*`), or null if empty. */
  static searchTerms(q: string | undefined): string | null {
    const terms = q
      ?.toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.slice(0, 8);
    return terms?.length ? terms.map((t) => `${t}:*`).join(' & ') : null;
  }

  private tagConnections(names: string[]): Prisma.TagCreateOrConnectWithoutPostsInput[] {
    const bySlug = new Map<string, string>();
    for (const raw of names) {
      const name = raw.trim();
      const slug = slugify(name);
      if (slug && !bySlug.has(slug)) bySlug.set(slug, name);
    }
    return [...bySlug].map(([slug, name]) => ({ where: { slug }, create: { slug, name } }));
  }

  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || 'post';
    const taken = new Set(
      (
        await this.prisma.post.findMany({
          where: { slug: { startsWith: base } },
          select: { slug: true },
        })
      ).map((p) => p.slug),
    );
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  }
}
