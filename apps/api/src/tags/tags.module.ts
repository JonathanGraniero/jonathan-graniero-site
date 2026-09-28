import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller.ts';
import { TagsService } from './tags.service.ts';

@Module({
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}
