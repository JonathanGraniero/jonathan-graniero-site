import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { ContactInput } from '@site/shared';

export class ContactDto implements ContactInput {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  /** Honeypot field — must be left empty. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
