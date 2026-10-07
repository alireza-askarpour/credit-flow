import { Injectable } from '@nestjs/common';
import { PaymentEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PaymentEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PaymentEventUncheckedCreateInput): Promise<PaymentEvent> {
    return this.prisma.paymentEvent.create({ data });
  }

  createWithClient(
    client: Prisma.TransactionClient,
    data: Prisma.PaymentEventUncheckedCreateInput,
  ): Promise<PaymentEvent> {
    return client.paymentEvent.create({ data });
  }

  findByPaymentRequestId(paymentRequestId: string): Promise<PaymentEvent[]> {
    return this.prisma.paymentEvent.findMany({
      where: { paymentRequestId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
