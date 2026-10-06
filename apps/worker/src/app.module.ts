import { Module } from '@nestjs/common';
import { MessagingModule } from '@app/messaging';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';

@Module({
  imports: [PrismaModule, RedisModule, MessagingModule],
})
export class WorkerModule {}
