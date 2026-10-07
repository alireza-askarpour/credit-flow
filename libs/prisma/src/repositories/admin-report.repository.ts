import { Injectable } from '@nestjs/common';
import {
  $Enums,
  Prisma,
  PaymentRequest,
  Transaction,
  User,
} from '@prisma/client';
import { PaymentStatus, TransactionType } from '@app/common';
import { PrismaService } from '../prisma.service';
import { PrismaQueryFilterService } from '../query-filter.service';

export type AdminReportPeriod = 'daily' | 'monthly' | 'yearly';

const TRANSACTION_TYPE_MAP: Record<TransactionType, $Enums.TransactionType> = {
  [TransactionType.CREDIT]: $Enums.TransactionType.CREDIT,
  [TransactionType.DEBIT]: $Enums.TransactionType.DEBIT,
};

const PAYMENT_STATUS_MAP: Record<PaymentStatus, $Enums.PaymentRequestStatus> = {
  [PaymentStatus.PENDING]: $Enums.PaymentRequestStatus.PENDING,
  [PaymentStatus.QUEUED]: $Enums.PaymentRequestStatus.QUEUED,
  [PaymentStatus.PROCESSING]: $Enums.PaymentRequestStatus.PROCESSING,
  [PaymentStatus.SUCCEEDED]: $Enums.PaymentRequestStatus.SUCCEEDED,
  [PaymentStatus.FAILED]: $Enums.PaymentRequestStatus.FAILED,
  [PaymentStatus.CANCELLED]: $Enums.PaymentRequestStatus.CANCELLED,
};

export interface AdminPaginationOptions {
  page: number;
  limit: number;
}

export interface AdminTransactionSummary {
  type: string;
  _sum?: { amount?: bigint | null } | null;
  _count?: { _all?: number } | boolean | null;
}

export interface AdminPaymentSummary {
  status: string;
  _count?: { _all?: number } | boolean | null;
}

export interface AdminAggregateTransactionRow {
  period: Date;
  total_credits: bigint | null;
  total_debits: bigint | null;
  credit_count: bigint;
  debit_count: bigint;
}

export interface AdminUsageRow {
  user_id: string;
  name: string;
  email: string;
  current_balance: bigint;
  total_credited: bigint | null;
  total_debited: bigint | null;
  payment_count: bigint;
  pending_count: bigint;
  queued_count: bigint;
  processing_count: bigint;
  succeeded_count: bigint;
  failed_count: bigint;
  cancelled_count: bigint;
}

type AdminPayment = Prisma.PaymentRequestGetPayload<{
  include: { user: { select: { id: true; name: true; email: true } } };
}>;

@Injectable()
export class AdminReportRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryFilter: PrismaQueryFilterService,
  ) {}

  async findUsers(
    options: AdminPaginationOptions & { search?: string; filterString?: string; sortString?: string },
  ): Promise<{ items: User[]; total: number }> {
    const where: Prisma.UserWhereInput = options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' } },
            { email: { contains: options.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const findMany = this.queryFilter.users(options, where);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany(findMany),
      this.prisma.user.count({ where: findMany.where }),
    ]);
    return { items, total };
  }

  async findUserAccount(userId: string): Promise<{
    user: User;
    transactionSummary: AdminTransactionSummary[];
    paymentSummary: AdminPaymentSummary[];
  } | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const [transactionSummary, paymentSummary] = await this.prisma.$transaction([
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { userId },
        orderBy: { type: 'asc' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.paymentRequest.groupBy({
        by: ['status'],
        where: { userId },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);

    return { user, transactionSummary, paymentSummary };
  }

  async findUserTransactions(
    userId: string,
    options: AdminPaginationOptions & {
      type?: TransactionType;
      dateFrom?: Date;
      dateTo?: Date;
      filterString?: string;
      sortString?: string;
    },
  ): Promise<{ items: Transaction[]; total: number }> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      type: options.type
        ? this.toPrismaTransactionType(options.type)
        : undefined,
      createdAt:
        options.dateFrom || options.dateTo
          ? { gte: options.dateFrom, lte: options.dateTo }
          : undefined,
    };
    const findMany = this.queryFilter.transactions(options, where);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany(findMany),
      this.prisma.transaction.count({ where: findMany.where }),
    ]);
    return { items, total };
  }

  aggregateTransactions(
    period: AdminReportPeriod,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<AdminAggregateTransactionRow[]> {
    const from = dateFrom ? Prisma.sql`AND "createdAt" >= ${dateFrom}` : Prisma.empty;
    const to = dateTo ? Prisma.sql`AND "createdAt" <= ${dateTo}` : Prisma.empty;

    return this.prisma.$queryRaw<
      Array<{
        period: Date;
        total_credits: bigint | null;
        total_debits: bigint | null;
        credit_count: bigint;
        debit_count: bigint;
      }>
    >`
      SELECT date_trunc(${period}, "createdAt") AS period,
        COALESCE(SUM(CASE WHEN "type" = 'CREDIT' THEN "amount" ELSE 0 END), 0)::bigint AS total_credits,
        COALESCE(SUM(CASE WHEN "type" = 'DEBIT' THEN "amount" ELSE 0 END), 0)::bigint AS total_debits,
        COUNT(*) FILTER (WHERE "type" = 'CREDIT')::bigint AS credit_count,
        COUNT(*) FILTER (WHERE "type" = 'DEBIT')::bigint AS debit_count
      FROM "transactions"
      WHERE 1 = 1 ${from} ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
  }

  usageByUser(): Promise<AdminUsageRow[]> {
    return this.prisma.$queryRaw<
      Array<{
        user_id: string;
        name: string;
        email: string;
        current_balance: bigint;
        total_credited: bigint | null;
        total_debited: bigint | null;
        payment_count: bigint;
        pending_count: bigint;
        queued_count: bigint;
        processing_count: bigint;
        succeeded_count: bigint;
        failed_count: bigint;
        cancelled_count: bigint;
      }>
    >`
      WITH transaction_totals AS (
        SELECT "userId",
          COALESCE(SUM("amount") FILTER (WHERE "type" = 'CREDIT'), 0)::bigint AS total_credited,
          COALESCE(SUM("amount") FILTER (WHERE "type" = 'DEBIT'), 0)::bigint AS total_debited
        FROM "transactions"
        GROUP BY "userId"
      ), payment_totals AS (
        SELECT "userId",
          COUNT(*)::bigint AS payment_count,
          COUNT(*) FILTER (WHERE "status" = 'PENDING')::bigint AS pending_count,
          COUNT(*) FILTER (WHERE "status" = 'QUEUED')::bigint AS queued_count,
          COUNT(*) FILTER (WHERE "status" = 'PROCESSING')::bigint AS processing_count,
          COUNT(*) FILTER (WHERE "status" = 'SUCCEEDED')::bigint AS succeeded_count,
          COUNT(*) FILTER (WHERE "status" = 'FAILED')::bigint AS failed_count,
          COUNT(*) FILTER (WHERE "status" = 'CANCELLED')::bigint AS cancelled_count
        FROM "payment_requests"
        GROUP BY "userId"
      )
      SELECT u."id" AS user_id, u."name", u."email",
        u."balance" AS current_balance,
        COALESCE(tt.total_credited, 0)::bigint AS total_credited,
        COALESCE(tt.total_debited, 0)::bigint AS total_debited,
        COALESCE(pt.payment_count, 0)::bigint AS payment_count,
        COALESCE(pt.pending_count, 0)::bigint AS pending_count,
        COALESCE(pt.queued_count, 0)::bigint AS queued_count,
        COALESCE(pt.processing_count, 0)::bigint AS processing_count,
        COALESCE(pt.succeeded_count, 0)::bigint AS succeeded_count,
        COALESCE(pt.failed_count, 0)::bigint AS failed_count,
        COALESCE(pt.cancelled_count, 0)::bigint AS cancelled_count
      FROM "users" u
      LEFT JOIN transaction_totals tt ON tt."userId" = u."id"
      LEFT JOIN payment_totals pt ON pt."userId" = u."id"
      ORDER BY u."createdAt" DESC
    `;
  }

  async findPayments(
    options: AdminPaginationOptions & { status?: PaymentStatus; filterString?: string; sortString?: string },
  ): Promise<{ items: AdminPayment[]; total: number }> {
    const where: Prisma.PaymentRequestWhereInput = {
      status: options.status
        ? this.toPrismaPaymentStatus(options.status)
        : undefined,
    };
    const findMany = this.queryFilter.payments(options, where);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentRequest.findMany({
        ...findMany,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.paymentRequest.count({ where: findMany.where }),
    ]);
    return { items, total };
  }

  private toPrismaTransactionType(type: TransactionType): $Enums.TransactionType {
    return TRANSACTION_TYPE_MAP[type];
  }

  private toPrismaPaymentStatus(
    status: PaymentStatus,
  ): $Enums.PaymentRequestStatus {
    return PAYMENT_STATUS_MAP[status];
  }
}
