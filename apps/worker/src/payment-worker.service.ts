import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  classifyPaymentError,
  calculateRetryDelay,
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
      await this.simulator.run(payment);
      await this.payments.completeSuccessfulPayment(
        payment.id,
        payment.userId,
        payment.amount,
        payment.reference,
      );
      return 'ack';
    } catch (error) {
      return this.handleFailure(job, payment.retryCount, payment.maxAttempts, error);
    }
  }

  private async handleFailure(
    job: PaymentJobDto,
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

    const attemptNumber = retryCount + 1;
    if (failureType === FailureType.BUSINESS) {
      await this.payments.failProcessing(paymentId, failureType, failureCode);
      return 'ack';
    }

    if (attemptNumber >= maxAttempts) {
      await this.payments.failProcessing(
        paymentId,
        FailureType.TECHNICAL,
        'MAX_RETRIES_EXCEEDED',
      );
      await this.messaging.publishPaymentDeadLetter(job, {
        attemptNumber,
        errorCode: failureCode,
      });
      return 'ack';
    }

    const delayMs = calculateRetryDelay(attemptNumber);
    const retryAt = new Date(Date.now() + delayMs);
    await this.payments.requeueProcessing(paymentId, retryAt, {
      attemptNumber,
      delayMs,
      errorCode: failureCode,
    });
    await this.messaging.publishPaymentRetry(job, delayMs, {
      attemptNumber,
      delayMs,
      errorCode: failureCode,
    });
    this.logger.warn(
      `Scheduled retry ${attemptNumber} for payment ${paymentId} in ${delayMs}ms`,
    );
    return 'ack';
  }

  private isTerminal(status: PaymentStatus): boolean {
    return [
      PaymentStatus.SUCCEEDED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
    ].includes(status);
  }
}
