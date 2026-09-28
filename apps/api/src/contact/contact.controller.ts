import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { ContactReceipt } from '@site/shared';
import { ContactService } from './contact.service.ts';
import { ContactDto } from './dto/contact.dto.ts';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  /** Stores a message from the contact form. Limited to 3 per IP per 10 minutes. */
  @Post()
  @Throttle({ default: { limit: 3, ttl: 10 * 60_000 } })
  @ApiTooManyRequestsResponse()
  submit(
    @Body() dto: ContactDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ContactReceipt> {
    return this.contact.submit(dto, { ip, userAgent });
  }
}
