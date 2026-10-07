import { Injectable } from '@nestjs/common';
import { Prisma, Transaction } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TransactionUncheckedCreateInput): Promise<Transaction> {
    return this.prisma.transaction.create({ data });
  }

  createWithClient(
    client: Prisma.TransactionClient,
    data: Prisma.TransactionUncheckedCreateInput,
  ): Promise<Transaction> {
    return client.transaction.create({ data });
  }

  findDebitByPaymentRequestId(paymentRequestId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: { paymentRequestId },
    });
  }

  findByUserId(userId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
