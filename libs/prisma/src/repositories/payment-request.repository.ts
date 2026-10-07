import { Injectable } from '@nestjs/common';
import {
  $Enums,
  Prisma,
  PaymentEvent,
  PaymentRequest,
} from '@prisma/client';
import {
  assertPaymentTransition,
  FailureType,
  InsufficientBalanceError,
  PaymentNotInProcessingStateError,
  PaymentStatus,
  ErrorCode,
  TransactionType,
  isEqual,
} from '@app/common';
import { PaymentEventRepository } from './payment-event.repository';
import { PrismaService } from '../prisma.service';

interface RetryMetadata {
  attemptNumber: number;
  delayMs: number;
  errorCode: string;
  originalErrorCode: string;
  errorMessage: string;
  failureType: FailureType;
}

const PAYMENT_STATUS_MAP: Record<
  PaymentStatus,
  $Enums.PaymentRequestStatus
> = {
  [PaymentStatus.PENDING]: $Enums.PaymentRequestStatus.PENDING,
  [PaymentStatus.QUEUED]: $Enums.PaymentRequestStatus.QUEUED,
  [PaymentStatus.PROCESSING]: $Enums.PaymentRequestStatus.PROCESSING,
  [PaymentStatus.SUCCEEDED]: $Enums.PaymentRequestStatus.SUCCEEDED,
  [PaymentStatus.FAILED]: $Enums.PaymentRequestStatus.FAILED,
  [PaymentStatus.CANCELLED]: $Enums.PaymentRequestStatus.CANCELLED,
};

const FAILURE_TYPE_MAP: Record<FailureType, $Enums.FailureType> = {
  [FailureType.BUSINESS]: $Enums.FailureType.BUSINESS,
  [FailureType.TECHNICAL]: $Enums.FailureType.TECHNICAL,
};

@Injectable()
export class PaymentRequestRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: PaymentEventRepository,
  ) {}

  findById(id: string): Promise<PaymentRequest | null> {
    return this.prisma.paymentRequest.findUnique({ where: { id } });
  }

  findEventsByPaymentRequestId(paymentRequestId: string): Promise<PaymentEvent[]> {
    return this.prisma.paymentEvent.findMany({
      where: { paymentRequestId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByUser(
    userId: string,
    options: {
      page: number;
      limit: number;
      status?: PaymentStatus;
      dateFrom?: Date;
      dateTo?: Date;
      reference?: string;
    },
  ): Promise<{ items: PaymentRequest[]; total: number }> {
    const where: Prisma.PaymentRequestWhereInput = {
      userId,
      status: options.status
        ? this.toPrismaPaymentStatus(options.status)
        : undefined,
      reference: options.reference
        ? { contains: options.reference, mode: 'insensitive' }
        : undefined,
      createdAt:
        options.dateFrom || options.dateTo
          ? { gte: options.dateFrom, lte: options.dateTo }
          : undefined,
    };
    const skip = (options.page - 1) * options.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: options.limit,
      }),
      this.prisma.paymentRequest.count({ where }),
    ]);

    return { items, total };
  }

  findByIdempotencyKey(idempotencyKey: string): Promise<PaymentRequest | null> {
    return this.prisma.paymentRequest.findUnique({
      where: { idempotencyKey },
    });
  }

  findPendingCreatedBefore(
    createdBefore: Date,
    limit = 100,
  ): Promise<PaymentRequest[]> {
    return this.prisma.paymentRequest.findMany({
      where: {
        status: $Enums.PaymentRequestStatus.PENDING,
        createdAt: { lt: createdBefore },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  create(
    data: Prisma.PaymentRequestUncheckedCreateInput,
  ): Promise<PaymentRequest> {
    return this.prisma.paymentRequest.create({ data });
  }

  async createWithCreatedEvent(
    data: Prisma.PaymentRequestUncheckedCreateInput,
  ): Promise<PaymentRequest> {
    return this.prisma.$transaction(async (client) => {
      const paymentRequest = await client.paymentRequest.create({ data });

      await this.events.createWithClient(client, {
        paymentRequestId: paymentRequest.id,
        eventType: $Enums.PaymentEventType.CREATED,
        newStatus: $Enums.PaymentRequestStatus.PENDING,
        attemptNumber: 0,
        metadata: { source: 'api' },
      });

      return paymentRequest;
    });
  }

  async transitionStatusWithEvent(
    id: string,
    expectedStatus: PaymentStatus,
    nextStatus: PaymentStatus,
    eventType: $Enums.PaymentEventType,
    metadata: Prisma.InputJsonValue,
    attemptNumber?: number,
  ): Promise<boolean> {
    assertPaymentTransition(expectedStatus, nextStatus);

    return this.prisma.$transaction(async (client) => {
      const transitionAt = new Date();
      const result = await client.paymentRequest.updateMany({
        where: {
          id,
          status: this.toPrismaPaymentStatus(expectedStatus),
        },
        data: {
          status: this.toPrismaPaymentStatus(nextStatus),
          queuedAt: this.getQueuedAt(
            expectedStatus,
            nextStatus,
            transitionAt,
          ),
          processingStartedAt: this.getProcessingStartedAt(
            expectedStatus,
            nextStatus,
            transitionAt,
          ),
        },
      });
      if (!isEqual(result.count, 1)) {
        return false;
      }

      await client.paymentEvent.create({
        data: {
          paymentRequestId: id,
          eventType,
          previousStatus: this.toPrismaPaymentStatus(expectedStatus),
          newStatus: this.toPrismaPaymentStatus(nextStatus),
          attemptNumber,
          metadata,
        },
      });
      return true;
    });
  }

  private getQueuedAt(
    expectedStatus: PaymentStatus,
    nextStatus: PaymentStatus,
    transitionAt: Date,
  ): Date | undefined {
    return isEqual(expectedStatus, PaymentStatus.PENDING) &&
      isEqual(nextStatus, PaymentStatus.QUEUED)
      ? transitionAt
      : undefined;
  }

  private getProcessingStartedAt(
    expectedStatus: PaymentStatus,
    nextStatus: PaymentStatus,
    transitionAt: Date,
  ): Date | undefined {
    return isEqual(expectedStatus, PaymentStatus.QUEUED) &&
      isEqual(nextStatus, PaymentStatus.PROCESSING)
      ? transitionAt
      : undefined;
  }

  private toPrismaPaymentStatus(
    status: PaymentStatus,
  ): $Enums.PaymentRequestStatus {
    return PAYMENT_STATUS_MAP[status];
  }

  private toPrismaFailureType(failureType: FailureType): $Enums.FailureType {
    return FAILURE_TYPE_MAP[failureType];
  }

  claimForProcessing(
    id: string,
    workerId: string,
    attemptNumber: number,
  ): Promise<boolean> {
    return this.transitionStatusWithEvent(
      id,
      PaymentStatus.QUEUED,
      PaymentStatus.PROCESSING,
      $Enums.PaymentEventType.PROCESSING_STARTED,
      { workerId, failureType: null },
      attemptNumber,
    );
  }

  incrementRetry(id: string, nextRetryAt: Date): Promise<PaymentRequest> {
    return this.prisma.paymentRequest.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        nextRetryAt,
      },
    });
  }

  async completeSuccessfulPayment(
    paymentId: string,
    userId: string,
    amount: bigint,
    reference: string,
    workerId: string,
    attemptNumber: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (client) => {
      const updatedUsers = await client.$queryRaw<Array<{ balance: bigint }>>`
        UPDATE "users"
        SET "balance" = "balance" - ${amount},
            "version" = "version" + 1
        WHERE "id" = ${userId}::uuid AND "balance" >= ${amount}
        RETURNING "balance"
      `;

      if (isEqual(updatedUsers.length, 0)) {
        throw new InsufficientBalanceError();
      }
      const updatedUser = updatedUsers[0];
      if (!updatedUser) {
        throw new Error(ErrorCode.UPDATED_USER_BALANCE_NOT_RETURNED);
      }

      const updatedPayment = await client.paymentRequest.updateMany({
        where: {
          id: paymentId,
          status: $Enums.PaymentRequestStatus.PROCESSING,
        },
        data: {
          status: $Enums.PaymentRequestStatus.SUCCEEDED,
          completedAt: new Date(),
        },
      });
      if (!isEqual(updatedPayment.count, 1)) {
        throw new PaymentNotInProcessingStateError();
      }

      await client.transaction.create({
        data: {
          userId,
          paymentRequestId: paymentId,
          amount,
          reference,
          type: TransactionType.DEBIT,
          balanceAfter: updatedUser.balance,
        },
      });

      await client.paymentEvent.create({
        data: {
          paymentRequestId: paymentId,
          eventType: $Enums.PaymentEventType.SUCCEEDED,
          previousStatus: $Enums.PaymentRequestStatus.PROCESSING,
          newStatus: $Enums.PaymentRequestStatus.SUCCEEDED,
          attemptNumber,
          metadata: { workerId, failureType: null },
        },
      });
    });
  }

  async failProcessing(
    paymentId: string,
    failureType: FailureType,
    failureCode: string,
    workerId: string,
    attemptNumber: number,
    errorMessage: string,
    originalErrorCode?: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (client) => {
      const result = await client.paymentRequest.updateMany({
        where: {
          id: paymentId,
          status: $Enums.PaymentRequestStatus.PROCESSING,
        },
        data: {
          status: $Enums.PaymentRequestStatus.FAILED,
          failureType: this.toPrismaFailureType(failureType),
          failureReason: failureCode,
          completedAt: new Date(),
        },
      });
      if (!isEqual(result.count, 1)) {
        return false;
      }

      await client.paymentEvent.create({
        data: {
          paymentRequestId: paymentId,
          eventType: $Enums.PaymentEventType.FAILED,
          previousStatus: $Enums.PaymentRequestStatus.PROCESSING,
          newStatus: $Enums.PaymentRequestStatus.FAILED,
          attemptNumber,
          metadata: {
            workerId,
            failureType,
            errorCode: failureCode,
            errorMessage,
            originalErrorCode: originalErrorCode ?? failureCode,
          },
        },
      });
      return true;
    });
  }

  async requeueProcessing(
    paymentId: string,
    nextRetryAt: Date,
    metadata: RetryMetadata,
    workerId: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (client) => {
      const result = await client.paymentRequest.updateMany({
        where: {
          id: paymentId,
          status: $Enums.PaymentRequestStatus.PROCESSING,
        },
        data: {
          status: $Enums.PaymentRequestStatus.QUEUED,
          retryCount: { increment: 1 },
          nextRetryAt,
        },
      });
      if (!isEqual(result.count, 1)) {
        return false;
      }

      await client.paymentEvent.create({
        data: {
          paymentRequestId: paymentId,
          eventType: $Enums.PaymentEventType.RETRY_TRIGGERED,
          previousStatus: $Enums.PaymentRequestStatus.PROCESSING,
          newStatus: $Enums.PaymentRequestStatus.QUEUED,
          attemptNumber: metadata.attemptNumber,
          metadata: { ...metadata, workerId },
        },
      });
      return true;
    });
  }
}
