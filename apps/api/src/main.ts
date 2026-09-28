import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.ts';
import { configureApp, setupSwagger } from './app.setup.ts';
import type { Env } from './config/env.ts';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app);
  setupSwagger(app);

  const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true });
  await app.listen(port);
  app.get(Logger).log(`API listening on http://localhost:${port}/api (docs at /docs)`);
}

void bootstrap();
