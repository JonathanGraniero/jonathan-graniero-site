import { Controller, Get, Header } from '@nestjs/common';
import { ApiProduces, ApiTags } from '@nestjs/swagger';
import { CacheControl, CachePolicy } from '../common/decorators/cache-control.decorator.ts';
import { FeedService } from './feed.service.ts';

@ApiTags('feed')
@Controller()
@CacheControl(CachePolicy.PublicLong)
export class FeedController {
  constructor(private readonly feed: FeedService) {}

  /** RSS 2.0 feed of the 20 most recent posts. */
  @Get('rss.xml')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  @ApiProduces('application/rss+xml')
  rss(): Promise<string> {
    return this.feed.rss();
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @ApiProduces('application/xml')
  sitemap(): Promise<string> {
    return this.feed.sitemap();
  }
}
