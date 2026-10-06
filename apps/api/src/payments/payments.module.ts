import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MessagingModule } from '@app/messaging';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PendingPaymentRecoveryService } from './pending-payment-recovery.service';

@Module({
  imports: [PrismaModule, RedisModule, MessagingModule, ScheduleModule.forRoot()],
  controllers: [PaymentsController],
  providers: [PaymentsService, PendingPaymentRecoveryService],
})
export class PaymentsModule {}
