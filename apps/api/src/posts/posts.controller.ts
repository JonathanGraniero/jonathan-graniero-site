import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import type { Paginated, PostDetail, PostSummary } from '@site/shared';
import { CacheControl, CachePolicy } from '../common/decorators/cache-control.decorator.ts';
import { PostListQueryDto } from './dto/post-query.dto.ts';
import { PostsService } from './posts.service.ts';

@ApiTags('posts')
@Controller('posts')
@CacheControl(CachePolicy.PublicShort)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  /** Published posts, newest first. Supports tag filtering and full-text search. */
  @Get()
  list(@Query() query: PostListQueryDto): Promise<Paginated<PostSummary>> {
    return this.posts.listPublished(query);
  }

  /** A single published post with its previous/next neighbours. */
  @Get(':slug')
  @ApiNotFoundResponse()
  get(@Param('slug') slug: string): Promise<PostDetail> {
    return this.posts.getPublishedBySlug(slug);
  }
}
