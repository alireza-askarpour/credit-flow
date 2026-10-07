import { Injectable } from '@nestjs/common';
import { PaymentEvent, Prisma } from '@prisma/client';

@Injectable()
export class PaymentEventRepository {
  createWithClient(
    client: Prisma.TransactionClient,
    data: Prisma.PaymentEventUncheckedCreateInput,
  ): Promise<PaymentEvent> {
    return client.paymentEvent.create({ data });
  }
}
