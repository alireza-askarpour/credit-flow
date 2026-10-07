import { Injectable } from '@nestjs/common';
import {
  PaymentRequestStatus as PrismaPaymentRequestStatus,
  PaymentEventType as PrismaPaymentEventType,
  FailureType as PrismaFailureType,
  Prisma,
  PaymentEvent,
  PaymentRequest,
} from '@prisma/client';
import {
  assertPaymentTransition,
  FailureType,
  InsufficientBalanceError,
  PaymentStatus,
  ErrorCode,
  TransactionType,
} from '@app/common';
import { PaymentEventRepository } from './payment-event.repository';
import { PrismaService } from '../prisma.service';

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
        ? (options.status as PrismaPaymentRequestStatus)
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
        status: PrismaPaymentRequestStatus.PENDING,
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
        eventType: PrismaPaymentEventType.CREATED,
        newStatus: PrismaPaymentRequestStatus.PENDING,
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
    eventType: string,
    metadata: Record<string, unknown>,
    attemptNumber?: number,
  ): Promise<boolean> {
    assertPaymentTransition(expectedStatus, nextStatus);

    return this.prisma.$transaction(async (client) => {
      const result = await client.paymentRequest.updateMany({
        where: {
          id,
          status: expectedStatus as PrismaPaymentRequestStatus,
        },
        data: {
          status: nextStatus as PrismaPaymentRequestStatus,
        },
      });
      if (result.count !== 1) {
        return false;
      }

      await client.paymentEvent.create({
        data: {
          paymentRequestId: id,
          eventType: eventType as PrismaPaymentEventType,
          previousStatus: expectedStatus as PrismaPaymentRequestStatus,
          newStatus: nextStatus as PrismaPaymentRequestStatus,
          attemptNumber,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
      return true;
    });
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
      PrismaPaymentEventType.PROCESSING_STARTED,
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
        WHERE "id" = ${userId} AND "balance" >= ${amount}
        RETURNING "balance"
      `;

      if (updatedUsers.length === 0) {
        throw new InsufficientBalanceError();
      }
      const updatedUser = updatedUsers[0];
      if (!updatedUser) {
        throw new Error(ErrorCode.UPDATED_USER_BALANCE_NOT_RETURNED);
      }

      const updatedPayment = await client.paymentRequest.updateMany({
        where: {
          id: paymentId,
          status: PrismaPaymentRequestStatus.PROCESSING,
        },
        data: {
          status: PrismaPaymentRequestStatus.SUCCEEDED,
          completedAt: new Date(),
        },
      });
      if (updatedPayment.count !== 1) {
        throw new Error(ErrorCode.PAYMENT_NOT_IN_PROCESSING_STATE);
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
          eventType: PrismaPaymentEventType.SUCCEEDED,
          previousStatus: PrismaPaymentRequestStatus.PROCESSING,
          newStatus: PrismaPaymentRequestStatus.SUCCEEDED,
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
  ): Promise<boolean> {
    return this.prisma.$transaction(async (client) => {
      const result = await client.paymentRequest.updateMany({
        where: {
          id: paymentId,
          status: PrismaPaymentRequestStatus.PROCESSING,
        },
        data: {
          status: PrismaPaymentRequestStatus.FAILED,
          failureType: failureType as PrismaFailureType,
          failureReason: failureCode,
          completedAt: new Date(),
        },
      });
      if (result.count !== 1) {
        return false;
      }

      await client.paymentEvent.create({
        data: {
          paymentRequestId: paymentId,
          eventType: PrismaPaymentEventType.FAILED,
          previousStatus: PrismaPaymentRequestStatus.PROCESSING,
          newStatus: PrismaPaymentRequestStatus.FAILED,
          attemptNumber,
          metadata: {
            workerId,
            failureType,
            errorCode: failureCode,
          },
        },
      });
      return true;
    });
  }

  async requeueProcessing(
    paymentId: string,
    nextRetryAt: Date,
    metadata: Record<string, unknown>,
    workerId: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (client) => {
      const result = await client.paymentRequest.updateMany({
        where: {
          id: paymentId,
          status: PrismaPaymentRequestStatus.PROCESSING,
        },
        data: {
          status: PrismaPaymentRequestStatus.QUEUED,
          retryCount: { increment: 1 },
          nextRetryAt,
        },
      });
      if (result.count !== 1) {
        return false;
      }

      await client.paymentEvent.create({
        data: {
          paymentRequestId: paymentId,
          eventType: PrismaPaymentEventType.RETRY_TRIGGERED,
          previousStatus: PrismaPaymentRequestStatus.PROCESSING,
          newStatus: PrismaPaymentRequestStatus.QUEUED,
          attemptNumber: metadata.attemptNumber as number,
          metadata: { ...metadata, workerId } as Prisma.InputJsonValue,
        },
      });
      return true;
    });
  }
}
