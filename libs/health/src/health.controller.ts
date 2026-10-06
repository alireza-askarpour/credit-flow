import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { MessagingService } from '@app/messaging';
import { PrismaService } from '@app/prisma';
import { RedisService } from '@app/redis';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly messaging: MessagingService,
  ) {}

  @Get()
  async check(): Promise<Record<string, unknown>> {
    const checks: Record<string, string> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'down';
    }

    try {
      await this.redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'down';
    }

    checks.rabbitmq = this.messaging.isHealthy() ? 'ok' : 'down';
    const healthy = Object.values(checks).every((value) => value === 'ok');
    const result = { status: healthy ? 'ok' : 'degraded', checks };

    if (!healthy) {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }
}
