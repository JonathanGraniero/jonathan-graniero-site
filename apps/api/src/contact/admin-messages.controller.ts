import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { ContactMessage, MessageStats, Paginated } from '@site/shared';
import { AdminOnly } from '../auth/admin.decorator.ts';
import { ContactService } from './contact.service.ts';
import { MessageListQueryDto } from './dto/message-query.dto.ts';
import { UpdateMessageDto } from './dto/update-message.dto.ts';

/** Admin inbox for contact-form submissions. */
@ApiTags('admin')
@Controller('admin/messages')
@AdminOnly()
export class AdminMessagesController {
  constructor(private readonly contact: ContactService) {}

  /** Newest first. `?unread=true` for unread only. */
  @Get()
  list(@Query() query: MessageListQueryDto): Promise<Paginated<ContactMessage>> {
    return this.contact.list(query);
  }

  /** Counts for the nav badge. */
  @Get('stats')
  stats(): Promise<MessageStats> {
    return this.contact.stats();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMessageDto): Promise<ContactMessage> {
    return this.contact.setRead(id, dto.read);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.contact.remove(id);
  }
}
