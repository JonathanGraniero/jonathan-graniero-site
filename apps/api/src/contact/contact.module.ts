import { Module } from '@nestjs/common';
import { AdminMessagesController } from './admin-messages.controller.ts';
import { ContactController } from './contact.controller.ts';
import { ContactService } from './contact.service.ts';

@Module({
  controllers: [ContactController, AdminMessagesController],
  providers: [ContactService],
})
export class ContactModule {}
