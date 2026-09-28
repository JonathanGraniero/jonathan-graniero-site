import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller.ts';
import { ContactService } from './contact.service.ts';

@Module({
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
