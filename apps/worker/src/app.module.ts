import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma';

@Module({
  imports: [PrismaModule],
})
export class WorkerModule {}
