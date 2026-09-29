import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Env } from './config/env.ts';
import { AUTH_COOKIE } from './auth/auth.constants.ts';
import { originVerify } from './common/middleware/origin-verify.middleware.ts';

export const API_PREFIX = 'api';

/** Parses TRUST_PROXY into what Express expects: boolean, hop count, or subnet list. */
function trustProxyValue(raw: string | undefined): boolean | number | string {
  if (raw === undefined || raw === '' || raw === 'false') return false;
  if (raw === 'true') return true;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

/**
 * Global HTTP configuration shared by `main.ts` and the e2e test harness, so
 * tests exercise exactly the same pipeline as production.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.set('trust proxy', trustProxyValue(config.get('TRUST_PROXY', { infer: true })));
  const originSecret = config.get('ORIGIN_VERIFY_SECRET', { infer: true });
  if (originSecret) app.use(originVerify(originSecret));
  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
}

export function setupSwagger(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const enabled = config.get('SWAGGER_ENABLED', { infer: true });
  if (
    enabled === 'false' ||
    (enabled === undefined && config.get('NODE_ENV', { infer: true }) === 'production')
  ) {
    return;
  }
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Personal site API')
      .setDescription('Blog posts, profile and career content.')
      .setVersion('1.0')
      .addCookieAuth(AUTH_COOKIE)
      .build(),
  );
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs/openapi.json' });
}
