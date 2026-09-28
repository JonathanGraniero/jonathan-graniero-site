import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Paginated, PostDetail, PostSummary } from '@site/shared';
import { AdminOnly } from '../auth/admin.decorator.ts';
import { CreatePostDto, UpdatePostDto } from './dto/post-input.dto.ts';
import { AdminPostListQueryDto } from './dto/post-query.dto.ts';
import { PostsService } from './posts.service.ts';

@ApiTags('admin')
@Controller('admin/posts')
@AdminOnly()
export class AdminPostsController {
  constructor(private readonly posts: PostsService) {}

  /** All posts including drafts. */
  @Get()
  list(@Query() query: AdminPostListQueryDto): Promise<Paginated<PostSummary>> {
    return this.posts.listAll(query);
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<PostDetail> {
    return this.posts.getById(id);
  }

  @Post()
  create(@Body() dto: CreatePostDto): Promise<PostDetail> {
    return this.posts.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePostDto): Promise<PostDetail> {
    return this.posts.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.posts.remove(id);
  }
}
