import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module.ts';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.ts';
import { CacheControlInterceptor } from './common/interceptors/cache-control.interceptor.ts';
import { validateEnv, type Env } from './config/env.ts';
import { ContactModule } from './contact/contact.module.ts';
import { FeedModule } from './feed/feed.module.ts';
import { HealthModule } from './health/health.module.ts';
import { PostsModule } from './posts/posts.module.ts';
import { PrismaModule } from './prisma/prisma.module.ts';
import { ProfileModule } from './profile/profile.module.ts';
import { TagsModule } from './tags/tags.module.ts';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const env = config.get('NODE_ENV', { infer: true });
        return {
          pinoHttp: {
            level: env === 'test' ? 'silent' : env === 'production' ? 'info' : 'debug',
            transport:
              env === 'development'
                ? { target: 'pino-pretty', options: { singleLine: true } }
                : undefined,
            redact: [
              'req.headers.cookie',
              'req.headers.authorization',
              'res.headers["set-cookie"]',
            ],
            autoLogging: { ignore: (req) => req.url === '/api/health' },
          },
        };
      },
    }),
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }] }),
    PrismaModule,
    AuthModule,
    PostsModule,
    TagsModule,
    ProfileModule,
    ContactModule,
    FeedModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: CacheControlInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
