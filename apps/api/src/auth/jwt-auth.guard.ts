import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '@site/shared';
import { AUTH_COOKIE } from './auth.constants.ts';
import { AuthService } from './auth.service.ts';

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

/**
 * Accepts the session from the httpOnly cookie set by the web app, or from an
 * `Authorization: Bearer` header for scripted API use.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }
    req.user = await this.auth.verifyToken(token);
    return true;
  }

  private extractToken(req: Request): string | undefined {
    const cookie = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE];
    if (cookie) return cookie;
    const [scheme, value] = req.headers.authorization?.split(' ') ?? [];
    return scheme === 'Bearer' ? value : undefined;
  }
}
