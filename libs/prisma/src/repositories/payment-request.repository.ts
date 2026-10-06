import { Injectable } from '@nestjs/common';
import {
  PaymentRequestStatus as PrismaPaymentRequestStatus,
  PaymentEventType as PrismaPaymentEventType,
  Prisma,
} from '@prisma/client';
import {
  assertPaymentTransition,
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
      | 'RETRY_TRIGGERED',
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
}
