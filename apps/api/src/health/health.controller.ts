import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { CacheControl, CachePolicy } from '../common/decorators/cache-control.decorator.ts';
import { PrismaService } from '../prisma/prisma.service.ts';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
@CacheControl(CachePolicy.NoStore)
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicators: HealthIndicatorService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  /** Liveness + dependency check for load balancers and uptime monitors. */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.database(),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  private async database() {
    const indicator = this.indicators.check('database');
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return indicator.up();
    } catch (err) {
      return indicator.down({ message: (err as Error).message });
    }
  }
}
