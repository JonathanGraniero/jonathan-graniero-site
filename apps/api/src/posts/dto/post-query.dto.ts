import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { PostListQuery, PostStatus } from '@site/shared';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.ts';

export class PostListQueryDto extends PaginationQueryDto implements PostListQuery {
  /** Filter by tag slug. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  tag?: string;

  /** Full-text search over title, excerpt and body (prefix-matching). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class AdminPostListQueryDto extends PostListQueryDto {
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: PostStatus;
}
