import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { LoginInput } from '@site/shared';

export class LoginDto implements LoginInput {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password: string;
}
