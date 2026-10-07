import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { TransactionType } from '@app/common';
import { TransactionRepository } from './transaction.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionRepository,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: Prisma.UserUncheckedCreateInput): Promise<User> {
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

  credit(userId: string, amount: bigint): Promise<User> {
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
  ): Promise<User> {
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
        type: TransactionType.CREDIT,
        balanceAfter: user.balance,
      });

      return user;
    });
  }
}
