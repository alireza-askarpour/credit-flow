import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { MessagingService } from '@app/messaging';
import { PrismaService } from '@app/prisma';
import { RedisService } from '@app/redis';
import { isEqual } from '@app/common';
import { HealthStatus } from './health-status.enum';

interface HealthChecks {
  database: HealthStatus;
  redis: HealthStatus;
  rabbitmq: HealthStatus;
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly messaging: MessagingService,
  ) {}

  @Get()
  async check(): Promise<Record<string, unknown>> {
    const result = await this.getHealthResult();

    if (isEqual(result.status, HealthStatus.DEGRADED)) {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }

  private async getHealthResult(): Promise<{
    status: HealthStatus;
    checks: HealthChecks;
  }> {
    const checks = await this.getChecks();
    const healthy = this.isHealthy(checks);

    return {
      status: healthy ? HealthStatus.OK : HealthStatus.DEGRADED,
      checks,
    };
  }

  private async getChecks(): Promise<HealthChecks> {
    return {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      rabbitmq: this.checkRabbitMq(),
    };
  }

  private async checkDatabase(): Promise<HealthStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return HealthStatus.OK;
    } catch {
      return HealthStatus.DOWN;
    }
  }

  private async checkRedis(): Promise<HealthStatus> {
    try {
      await this.redis.ping();
      return HealthStatus.OK;
    } catch {
      return HealthStatus.DOWN;
    }
  }

  private checkRabbitMq(): HealthStatus {
    return this.messaging.isHealthy() ? HealthStatus.OK : HealthStatus.DOWN;
  }

  private isHealthy(checks: HealthChecks): boolean {
    return Object.values(checks).every((value) =>
      isEqual(value, HealthStatus.OK),
    );
  }
}
