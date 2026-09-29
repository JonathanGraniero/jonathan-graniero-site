import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ContactMessage, ContactReceipt, MessageStats, Paginated } from '@site/shared';
import type { ContactMessage as ContactMessageRow } from '../generated/prisma/client.ts';
import { toPage } from '../common/utils/paginate.ts';
import { PrismaService } from '../prisma/prisma.service.ts';
import type { ContactDto } from './dto/contact.dto.ts';
import type { MessageListQueryDto } from './dto/message-query.dto.ts';

/** IP and user agent stay server-side; the inbox only shows what the sender wrote. */
function toMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  };
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly prisma: PrismaService) {}

  async submit(
    dto: ContactDto,
    meta: { ip?: string; userAgent?: string },
  ): Promise<ContactReceipt> {
    if (dto.website) {
      // Honeypot tripped: answer as if it worked so bots learn nothing.
      this.logger.warn({ ip: meta.ip }, 'Dropped contact submission (honeypot)');
      return { id: randomUUID(), receivedAt: new Date().toISOString() };
    }

    const saved = await this.prisma.contactMessage.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase(),
        message: dto.message.trim(),
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 500),
      },
    });
    return { id: saved.id, receivedAt: saved.createdAt.toISOString() };
  }

  // ---------- Admin inbox ----------

  async list(query: MessageListQueryDto): Promise<Paginated<ContactMessage>> {
    const where = query.unread ? { readAt: null } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return toPage(rows.map(toMessage), total, query.page, query.pageSize);
  }

  async stats(): Promise<MessageStats> {
    const [total, unread] = await this.prisma.$transaction([
      this.prisma.contactMessage.count(),
      this.prisma.contactMessage.count({ where: { readAt: null } }),
    ]);
    return { total, unread };
  }

  async setRead(id: string, read: boolean): Promise<ContactMessage> {
    const existing = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Message ${id} not found`);
    // Keep the original read time if it's marked read again.
    const readAt = read ? (existing.readAt ?? new Date()) : null;
    const row = await this.prisma.contactMessage.update({ where: { id }, data: { readAt } });
    return toMessage(row);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.contactMessage.delete({ where: { id } });
  }
}
