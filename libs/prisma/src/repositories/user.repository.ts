import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionRepository } from './transaction.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionRepository,
  ) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: Prisma.UserUncheckedCreateInput) {
    return this.prisma.user.create({ data });
  }

  async debitIfSufficientBalance(
    userId: string,
    amount: bigint,
  ): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: {
        id: userId,
        balance: { gte: amount },
      },
      data: {
        balance: { decrement: amount },
        version: { increment: 1 },
      },
    });

    return result.count === 1;
  }

  credit(userId: string, amount: bigint) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        balance: { increment: amount },
        version: { increment: 1 },
      },
    });
  }

  async creditWithTransaction(
    userId: string,
    amount: bigint,
    reference: string,
  ) {
    return this.prisma.$transaction(async (client) => {
      const user = await client.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amount },
          version: { increment: 1 },
        },
      });

      await this.transactions.createWithClient(client, {
        userId,
        amount,
        reference,
        type: 'CREDIT',
        balanceAfter: user.balance,
      });

      return user;
    });
  }
}
