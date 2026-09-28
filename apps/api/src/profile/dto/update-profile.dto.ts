import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { SocialLinksInput, UpdateProfileInput } from '@site/shared';

/** Each link may be `null` to clear it. */
export class SocialLinksDto implements SocialLinksInput {
  @IsOptional()
  @IsUrl()
  github?: string | null;

  @IsOptional()
  @IsUrl()
  linkedin?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsUrl()
  website?: string | null;
}

export class UpdateProfileDto implements UpdateProfileInput {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  /** Markdown. */
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  avatarUrl?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  resumeUrl?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  social?: SocialLinksDto;
}
