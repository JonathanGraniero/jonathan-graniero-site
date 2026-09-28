import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@site/shared';
import type { AuthenticatedRequest } from './jwt-auth.guard.ts';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
