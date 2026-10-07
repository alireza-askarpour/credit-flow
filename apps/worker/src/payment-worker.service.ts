import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  classifyPaymentError,
  calculateRetryDelay,
  FailureType,
  PaymentJobDto,
  PaymentProcessingError,
  PaymentStatus,
  ErrorCode,
  isIn,
  isNil,
  MessageOutcome,
} from '@app/common';
import { EnvironmentVariables } from '@app/config';
import { MessagingService } from '@app/messaging';
import { PaymentRequestRepository } from '@app/prisma';
import { PaymentFailureSimulator } from './payment-failure-simulator.service';

const TERMINAL_PAYMENT_STATUSES = [
  PaymentStatus.SUCCEEDED,
  PaymentStatus.FAILED,
  PaymentStatus.CANCELLED,
] as const;

@Injectable()
export class PaymentWorkerService implements OnModuleInit {
  private readonly logger = new Logger(PaymentWorkerService.name);
  private readonly workerId: string;

  constructor(
    private readonly messaging: MessagingService,
    private readonly payments: PaymentRequestRepository,
    private readonly simulator: PaymentFailureSimulator,
    config: ConfigService<EnvironmentVariables>,
  ) {
    this.workerId = config.getOrThrow('worker.id', { infer: true });
  }

  onModuleInit(): Promise<void> {
    return this.messaging.consumePaymentJobs((job) => this.process(job));
  }

  private async process(
    job: PaymentJobDto,
  ): Promise<MessageOutcome> {
    const payment = await this.payments.findById(job.paymentId);
    if (isNil(payment) || isIn(payment.status, TERMINAL_PAYMENT_STATUSES)) {
      return MessageOutcome.ACK;
    }

    const attemptNumber = payment.retryCount + 1;
    const claimed = await this.payments.claimForProcessing(
      payment.id,
      this.workerId,
      attemptNumber,
    );
    if (!claimed) {
      return MessageOutcome.ACK;
    }

    try {
      await this.simulator.run(payment);
      await this.payments.completeSuccessfulPayment(
        payment.id,
        payment.userId,
        payment.amount,
        payment.reference,
        this.workerId,
        attemptNumber,
      );
      return MessageOutcome.ACK;
    } catch (error) {
      return this.handleFailure(
        job,
        payment.id,
        payment.maxAttempts,
        attemptNumber,
        error,
      );
    }
  }

  private async handleFailure(
    job: PaymentJobDto,
    paymentId: string,
    maxAttempts: number,
    attemptNumber: number,
    error: unknown,
  ): Promise<MessageOutcome> {
    const failureType = classifyPaymentError(error);
    const failureCode =
      error instanceof PaymentProcessingError
        ? error.code
        : ErrorCode.PAYMENT_TECHNICAL_FAILURE;

    if (failureType === FailureType.BUSINESS) {
      await this.payments.failProcessing(
        paymentId,
        failureType,
        failureCode,
        this.workerId,
        attemptNumber,
      );
      return MessageOutcome.ACK;
    }

    if (attemptNumber >= maxAttempts) {
      await this.payments.failProcessing(
        paymentId,
        FailureType.TECHNICAL,
        ErrorCode.MAX_RETRIES_EXCEEDED,
        this.workerId,
        attemptNumber,
      );
      await this.messaging.publishPaymentDeadLetter(job, {
        attemptNumber,
        errorCode: failureCode,
      });
      return MessageOutcome.ACK;
    }

    const delayMs = calculateRetryDelay(attemptNumber);
    const retryAt = new Date(Date.now() + delayMs);
    await this.payments.requeueProcessing(paymentId, retryAt, {
      attemptNumber,
      delayMs,
      errorCode: failureCode,
    }, this.workerId);
    await this.messaging.publishPaymentRetry(job, delayMs, {
      attemptNumber,
      delayMs,
      errorCode: failureCode,
    });
    this.logger.warn(
      `Scheduled retry ${attemptNumber} for payment ${paymentId} in ${delayMs}ms`,
    );
    return MessageOutcome.ACK;
  }
}
