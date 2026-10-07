import { Injectable } from '@nestjs/common';
import { Prisma, Transaction } from '@prisma/client';

@Injectable()
export class TransactionRepository {
  createWithClient(
    client: Prisma.TransactionClient,
    data: Prisma.TransactionUncheckedCreateInput,
  ): Promise<Transaction> {
    return client.transaction.create({ data });
  }

}
