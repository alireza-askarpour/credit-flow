import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TransactionUncheckedCreateInput) {
    return this.prisma.transaction.create({ data });
  }

  createWithClient(
    client: Prisma.TransactionClient,
    data: Prisma.TransactionUncheckedCreateInput,
  ) {
    return client.transaction.create({ data });
  }

  findDebitByPaymentRequestId(paymentRequestId: string) {
    return this.prisma.transaction.findUnique({
      where: { paymentRequestId },
    });
  }

  findByUserId(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
