import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PaymentEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PaymentEventUncheckedCreateInput) {
    return this.prisma.paymentEvent.create({ data });
  }

  findByPaymentRequestId(paymentRequestId: string) {
    return this.prisma.paymentEvent.findMany({
      where: { paymentRequestId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
