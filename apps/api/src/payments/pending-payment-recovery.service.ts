import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentEvent, PaymentStatus } from '@app/common';
import { MessagingService } from '@app/messaging';
import { PaymentRequestRepository } from '@app/prisma';

const PENDING_RECOVERY_AGE_MS = 30_000;

@Injectable()
export class PendingPaymentRecoveryService {
  private readonly logger = new Logger(PendingPaymentRecoveryService.name);

  constructor(
    private readonly payments: PaymentRequestRepository,
    private readonly messaging: MessagingService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async republishStalePendingPayments(): Promise<void> {
    const createdBefore = new Date(Date.now() - PENDING_RECOVERY_AGE_MS);
    const pendingPayments = await this.payments.findPendingCreatedBefore(
      createdBefore,
    );

    for (const payment of pendingPayments) {
      try {
        await this.messaging.publishPaymentJob({
          event: PaymentEvent.QUEUED,
          paymentId: payment.id,
          userId: payment.userId,
          attempt: payment.retryCount,
        });

        await this.payments.transitionStatusWithEvent(
          payment.id,
          PaymentStatus.PENDING,
          PaymentStatus.QUEUED,
          'QUEUED',
          { source: 'recovery', failureType: null },
          payment.retryCount,
        );
      } catch (error) {
        this.logger.warn(
          `Could not republish pending payment ${payment.id}: ${String(error)}`,
        );
      }
    }
  }
}
