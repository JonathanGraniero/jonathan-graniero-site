import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthUser } from '@site/shared';
import type { Env } from '../config/env.ts';
import { AdminOnly } from './admin.decorator.ts';
import { AUTH_COOKIE } from './auth.constants.ts';
import { AuthService } from './auth.service.ts';
import { CurrentUser } from './current-user.decorator.ts';
import { LoginDto } from './dto/login.dto.ts';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Exchanges admin credentials for an httpOnly session cookie. */
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AuthUser> {
    const user = await this.auth.validateCredentials(dto.email, dto.password);
    const token = await this.auth.signToken(user);
    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      maxAge: this.config.get('JWT_TTL_SECONDS', { infer: true }) * 1000,
      path: '/',
    });
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(AUTH_COOKIE, { path: '/' });
  }

  /** Returns the current admin, or 401 if not signed in. */
  @Get('me')
  @AdminOnly()
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
