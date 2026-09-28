import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller.ts';
import { FeedService } from './feed.service.ts';

@Module({
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
