import { Injectable } from '@nestjs/common';
import {
  PaymentRequestStatus as PrismaPaymentRequestStatus,
  PaymentEventType as PrismaPaymentEventType,
  FailureType as PrismaFailureType,
  Prisma,
} from '@prisma/client';
import {
  assertPaymentTransition,
  FailureType,
  InsufficientBalanceError,
  PaymentStatus,
  PaymentTransitionContext,
} from '@app/common';
import { PaymentEventRepository } from './payment-event.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PaymentRequestRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: PaymentEventRepository,
  ) {}

  findById(id: string) {
    return this.prisma.paymentRequest.findUnique({ where: { id } });
  }

  findEventsByPaymentRequestId(paymentRequestId: string) {
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
  ) {
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

  findByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.paymentRequest.findUnique({
      where: { idempotencyKey },
    });
  }

  findPendingCreatedBefore(createdBefore: Date, limit = 100) {
    return this.prisma.paymentRequest.findMany({
      where: {
        status: PrismaPaymentRequestStatus.PENDING,
        createdAt: { lt: createdBefore },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  create(data: Prisma.PaymentRequestUncheckedCreateInput) {
    return this.prisma.paymentRequest.create({ data });
  }

  async createWithCreatedEvent(data: Prisma.PaymentRequestUncheckedCreateInput) {
    return this.prisma.$transaction(async (client) => {
      const paymentRequest = await client.paymentRequest.create({ data });

      await this.events.createWithClient(client, {
        paymentRequestId: paymentRequest.id,
        eventType: PrismaPaymentEventType.CREATED,
        newStatus: PrismaPaymentRequestStatus.PENDING,
        attemptNumber: 0,
      });

      return paymentRequest;
    });
  }

  recordEvent(
    paymentRequestId: string,
    eventType:
      | 'QUEUED'
      | 'PROCESSING_STARTED'
      | 'SUCCEEDED'
      | 'FAILED'
      | 'RETRY_TRIGGERED'
      | 'CANCELLED',
    newStatus?: PaymentStatus | PrismaPaymentRequestStatus,
  ) {
    return this.events.create({
      paymentRequestId,
      eventType: eventType as PrismaPaymentEventType,
      newStatus: newStatus as PrismaPaymentRequestStatus | undefined,
    });
  }

  async transitionStatus(
    id: string,
    expectedStatus: PaymentStatus,
    nextStatus: PaymentStatus,
    context: PaymentTransitionContext = {},
  ): Promise<boolean> {
    assertPaymentTransition(expectedStatus, nextStatus, context);

    const result = await this.prisma.paymentRequest.updateMany({
      where: {
        id,
        status: expectedStatus as PrismaPaymentRequestStatus,
      },
      data: {
        status: nextStatus as PrismaPaymentRequestStatus,
      },
    });

    return result.count === 1;
  }

  claimForProcessing(id: string): Promise<boolean> {
    return this.transitionStatus(id, PaymentStatus.QUEUED, PaymentStatus.PROCESSING);
  }

  incrementRetry(id: string, nextRetryAt: Date) {
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
        throw new Error('Payment was no longer in PROCESSING state');
      }

      await client.transaction.create({
        data: {
          userId,
          paymentRequestId: paymentId,
          amount,
          reference,
          type: 'DEBIT',
          balanceAfter: updatedUsers[0].balance,
        },
      });

      await client.paymentEvent.create({
        data: {
          paymentRequestId: paymentId,
          eventType: 'SUCCEEDED',
          newStatus: 'SUCCEEDED',
        },
      });
    });
  }

  async failProcessing(
    paymentId: string,
    failureType: FailureType,
    failureCode: string,
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
          eventType: 'FAILED',
          newStatus: 'FAILED',
        },
      });
      return true;
    });
  }

  async requeueProcessing(
    paymentId: string,
    nextRetryAt: Date,
    metadata: Record<string, unknown>,
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
          eventType: 'RETRY_TRIGGERED',
          newStatus: 'QUEUED',
          attemptNumber: metadata.attemptNumber as number,
          metadata,
        },
      });
      return true;
    });
  }
}
