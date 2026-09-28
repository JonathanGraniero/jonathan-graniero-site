import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import type { Request, Response } from 'express';
import type { ApiError } from '@site/shared';
import { Prisma } from '../../generated/prisma/client.ts';

/** Prisma error codes that map cleanly onto HTTP semantics. */
const PRISMA_STATUS: Record<string, HttpStatus> = {
  P2002: HttpStatus.CONFLICT, // unique constraint
  P2025: HttpStatus.NOT_FOUND, // record not found
};

interface UniqueViolationMeta {
  target?: string[];
  driverAdapterError?: {
    cause?: { constraint?: { fields?: string[]; index?: string } };
  };
}

/**
 * Best-effort name of the column behind a unique violation. Driver adapters
 * report the index (e.g. `Post_slug_key`) rather than the field list.
 */
export function uniqueViolationField(meta: unknown): string | undefined {
  const m = meta as UniqueViolationMeta | undefined;
  const constraint = m?.driverAdapterError?.cause?.constraint;
  const fields = m?.target ?? constraint?.fields;
  if (fields?.length) return fields.join(', ');
  return constraint?.index?.match(/^[^_]+_(.+)_key$/)?.[1]?.replace(/_/g, ', ');
}

/**
 * Normalises every error into the shared `ApiError` shape so the client only
 * ever has to handle one format. Unknown errors become opaque 500s.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { status, message } = this.resolve(exception);
    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const body: ApiError = {
      statusCode: status,
      error: STATUS_CODES[status] ?? 'Error',
      message,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    };
    res.status(status).json(body);
  }

  private resolve(exception: unknown): { status: number; message: string | string[] } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && response !== null && 'message' in response
          ? (response as { message: string | string[] }).message
          : exception.message;
      return { status: exception.getStatus(), message };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const status = PRISMA_STATUS[exception.code];
      if (status === HttpStatus.CONFLICT) {
        const field = uniqueViolationField(exception.meta);
        return { status, message: `A record with this ${field ?? 'value'} already exists` };
      }
      if (status === HttpStatus.NOT_FOUND) {
        return { status, message: 'Resource not found' };
      }
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
