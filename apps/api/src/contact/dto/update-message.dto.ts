import { IsBoolean } from 'class-validator';
import type { UpdateMessageInput } from '@site/shared';

export class UpdateMessageDto implements UpdateMessageInput {
  /** true marks the message read, false marks it unread. */
  @IsBoolean()
  read: boolean;
}
