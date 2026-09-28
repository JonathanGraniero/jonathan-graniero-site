import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { CACHE_CONTROL_KEY } from '../decorators/cache-control.decorator.ts';

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const value = this.reflector.getAllAndOverride<string | undefined>(CACHE_CONTROL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (value) {
      context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', value);
    }
    return next.handle();
  }
}
