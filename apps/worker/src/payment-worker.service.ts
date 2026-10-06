import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  classifyPaymentError,
  FailureType,
  PaymentJobDto,
  PaymentProcessingError,
  PaymentStatus,
} from '@app/common';
import { MessagingService } from '@app/messaging';
import { PaymentRequestRepository } from '@app/prisma';
import { PaymentFailureSimulator } from './payment-failure-simulator.service';

@Injectable()
export class PaymentWorkerService implements OnModuleInit {
  private readonly logger = new Logger(PaymentWorkerService.name);

  constructor(
    private readonly messaging: MessagingService,
    private readonly payments: PaymentRequestRepository,
    private readonly simulator: PaymentFailureSimulator,
  ) {}

  onModuleInit(): Promise<void> {
    return this.messaging.consumePaymentJobs((job) => this.process(job));
  }

  private async process(
    job: PaymentJobDto,
  ): Promise<'ack' | 'requeue' | 'reject'> {
    const payment = await this.payments.findById(job.paymentId);
    if (!payment || this.isTerminal(payment.status as PaymentStatus)) {
      return 'ack';
    }

    const claimed = await this.payments.claimForProcessing(payment.id);
    if (!claimed) {
      return 'ack';
    }

    try {
      await this.payments.recordEvent(
        payment.id,
        'PROCESSING_STARTED',
        PaymentStatus.PROCESSING,
      );
      await this.simulator.run();
      await this.payments.completeSuccessfulPayment(
        payment.id,
        payment.userId,
        payment.amount,
        payment.reference,
      );
      return 'ack';
    } catch (error) {
      return this.handleFailure(payment.id, payment.retryCount, payment.maxAttempts, error);
    }
  }

  private async handleFailure(
    paymentId: string,
    retryCount: number,
    maxAttempts: number,
    error: unknown,
  ): Promise<'ack' | 'requeue' | 'reject'> {
    const failureType = classifyPaymentError(error);
    const failureCode =
      error instanceof PaymentProcessingError
        ? error.code
        : 'PAYMENT_TECHNICAL_FAILURE';

    if (failureType === FailureType.BUSINESS || retryCount + 1 >= maxAttempts) {
      await this.payments.failProcessing(paymentId, failureType, failureCode);
      return 'ack';
    }

    const retryAt = new Date(Date.now() + this.retryDelay(retryCount));
    await this.payments.requeueProcessing(paymentId, retryAt);
    this.logger.warn(`Requeueing payment ${paymentId} after technical failure`);
    return 'requeue';
  }

  private isTerminal(status: PaymentStatus): boolean {
    return [
      PaymentStatus.SUCCEEDED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
    ].includes(status);
  }

  private retryDelay(retryCount: number): number {
    return Math.min(30_000, 1_000 * 2 ** retryCount);
  }
}
