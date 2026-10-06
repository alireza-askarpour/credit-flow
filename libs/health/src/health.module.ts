import { Module } from '@nestjs/common';
import { MessagingModule } from '@app/messaging';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, RedisModule, MessagingModule],
  controllers: [HealthController],
})
export class HealthModule {}
