import { Module } from '@nestjs/common';
import { AdminPostsController } from './admin-posts.controller.ts';
import { PostsController } from './posts.controller.ts';
import { PostsService } from './posts.service.ts';

@Module({
  controllers: [PostsController, AdminPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
