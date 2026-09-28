import { PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CreatePostInput, PostStatus, UpdatePostInput } from '@site/shared';

export class CreatePostDto implements CreatePostInput {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  /** Optional explicit slug; generated from the title when omitted. */
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be lowercase kebab-case' })
  @MaxLength(120)
  slug?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  excerpt: string;

  /** Post body as GitHub-flavoured markdown. */
  @IsString()
  @MinLength(1)
  @MaxLength(100_000)
  contentMd: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  coverImage?: string | null;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: PostStatus;

  /** Tag display names; created on demand. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(40, { each: true })
  tags?: string[];
}

export class UpdatePostDto extends PartialType(CreatePostDto) implements UpdatePostInput {}
