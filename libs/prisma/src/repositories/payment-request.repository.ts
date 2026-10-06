import { Injectable } from '@nestjs/common';
import {
  PaymentRequestStatus as PrismaPaymentRequestStatus,
  Prisma,
} from '@prisma/client';
import {
  assertPaymentTransition,
  PaymentStatus,
  PaymentTransitionContext,
} from '@app/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PaymentRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.paymentRequest.findUnique({ where: { id } });
  }

  findByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.paymentRequest.findUnique({
      where: { idempotencyKey },
    });
  }

  create(data: Prisma.PaymentRequestUncheckedCreateInput) {
    return this.prisma.paymentRequest.create({ data });
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
