import { Injectable } from '@nestjs/common';
import type { TagWithCount } from '@site/shared';
import { PrismaService } from '../prisma/prisma.service.ts';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tags that have at least one published post, most used first. */
  async listWithCounts(): Promise<TagWithCount[]> {
    const tags = await this.prisma.tag.findMany({
      select: {
        slug: true,
        name: true,
        _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
      },
    });
    return tags
      .map((t) => ({ slug: t.slug, name: t.name, postCount: t._count.posts }))
      .filter((t) => t.postCount > 0)
      .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
  }
}
