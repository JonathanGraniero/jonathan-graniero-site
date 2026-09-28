import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { TagWithCount } from '@site/shared';
import { CacheControl, CachePolicy } from '../common/decorators/cache-control.decorator.ts';
import { TagsService } from './tags.service.ts';

@ApiTags('posts')
@Controller('tags')
@CacheControl(CachePolicy.PublicShort)
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get()
  list(): Promise<TagWithCount[]> {
    return this.tags.listWithCounts();
  }
}
