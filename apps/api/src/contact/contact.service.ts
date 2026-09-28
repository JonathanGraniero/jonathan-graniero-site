import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ContactReceipt } from '@site/shared';
import { PrismaService } from '../prisma/prisma.service.ts';
import type { ContactDto } from './dto/contact.dto.ts';

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
}
