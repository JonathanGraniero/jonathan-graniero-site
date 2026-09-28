import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CacheControl, CachePolicy } from '../common/decorators/cache-control.decorator.ts';
import { JwtAuthGuard } from './jwt-auth.guard.ts';

/** Marks a controller/route as admin-only and never cacheable. */
export const AdminOnly = () =>
  applyDecorators(
    UseGuards(JwtAuthGuard),
    CacheControl(CachePolicy.NoStore),
    ApiCookieAuth(),
    ApiUnauthorizedResponse({ description: 'Missing or invalid session' }),
  );
