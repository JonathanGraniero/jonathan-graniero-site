import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import type { MessageListQuery } from '@site/shared';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.ts';

export class MessageListQueryDto extends PaginationQueryDto implements MessageListQuery {
  /** Only return unread messages. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unread?: boolean;
}
