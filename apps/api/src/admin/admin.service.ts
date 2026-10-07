import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode, isObject, PaymentStatus, TransactionType } from '@app/common';
import {
  AdminPaymentSummary,
  AdminReportPeriod,
  AdminReportRepository,
  AdminTransactionSummary,
} from '@app/prisma';
import { RedisService } from '@app/redis';
import { AdminPaginationQueryDto } from './dto/admin-pagination-query.dto';
import { AdminTransactionQueryDto } from './dto/admin-transaction-query.dto';
import { AdminPaymentQueryDto } from './dto/admin-payment-query.dto';
import { AggregateReportQueryDto } from './dto/aggregate-report-query.dto';

const REPORT_CACHE_TTL_SECONDS = 30;

interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  balance: bigint;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminTransactionRecord {
  id: string;
  userId: string;
  paymentRequestId: string | null;
  amount: bigint;
  reference: string;
  type: string;
  balanceAfter: bigint | null;
  createdAt: Date;
}

interface AggregateRow {
  period: Date;
  total_credits: bigint | null;
  total_debits: bigint | null;
  credit_count: bigint;
  debit_count: bigint;
}

interface UsageRow {
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

@Injectable()
export class AdminService {
  constructor(
    private readonly reports: AdminReportRepository,
    private readonly redis: RedisService,
  ) {}

  async listUsers(query: AdminPaginationQueryDto) {
    const result = await this.reports.findUsers(query);
    return {
      items: (result.items as AdminUserRecord[]).map((user) => this.toUser(user)),
      ...this.pagination(query, result.total),
    };
  }

  async getUser(id: string) {
    const result = await this.reports.findUserAccount(id);
    if (!result) throw new NotFoundException(ErrorCode.USER_NOT_FOUND);

    const credited = this.sumByType(result.transactionSummary, TransactionType.CREDIT);
    const debited = this.sumByType(result.transactionSummary, TransactionType.DEBIT);
    const paymentCounts = Object.fromEntries(
      Object.values(PaymentStatus).map((status) => [status, this.countByStatus(result.paymentSummary, status)]),
    );

    return {
      user: this.toUser(result.user),
      summary: {
        totalCredited: credited.amount,
        totalDebited: debited.amount,
        creditTransactionCount: credited.count,
        debitTransactionCount: debited.count,
        paymentCounts,
      },
    };
  }

  async listUserTransactions(id: string, query: AdminTransactionQueryDto) {
    const user = await this.reports.findUserAccount(id);
    if (!user) throw new NotFoundException(ErrorCode.USER_NOT_FOUND);

    const result = await this.reports.findUserTransactions(id, {
      page: query.page,
      limit: query.limit,
      type: query.type,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });
    return {
      items: (result.items as AdminTransactionRecord[]).map((transaction) => ({
        ...transaction,
        amount: transaction.amount.toString(),
        balanceAfter: transaction.balanceAfter?.toString(),
      })),
      ...this.pagination(query, result.total),
    };
  }

  async aggregate(query: AggregateReportQueryDto) {
    const key = `admin:reports:aggregate:${this.cacheSuffix(query)}`;
    return this.cached(key, async () => {
      const rows = await this.reports.aggregateTransactions(
        query.period as AdminReportPeriod,
        query.from ? new Date(query.from) : undefined,
        query.to ? new Date(query.to) : undefined,
      );
      return (rows as AggregateRow[]).map((row) => ({
        period: row.period,
        totalCredits: this.bigIntString(row.total_credits),
        totalDebits: this.bigIntString(row.total_debits),
        creditCount: row.credit_count.toString(),
        debitCount: row.debit_count.toString(),
      }));
    });
  }

  async usage() {
    return this.cached('admin:reports:usage', async () => {
      const rows = await this.reports.usageByUser();
      return (rows as UsageRow[]).map((row) => {
        const credited = this.bigIntString(row.total_credited);
        const debited = this.bigIntString(row.total_debited);
        return {
          user: { id: row.user_id, name: row.name, email: row.email },
          currentBalance: row.current_balance.toString(),
          totalCredited: credited,
          totalDebited: debited,
          usagePercent: this.usagePercent(row.total_debited, row.total_credited),
          paymentCounts: {
            total: row.payment_count.toString(),
            pending: row.pending_count.toString(),
            queued: row.queued_count.toString(),
            processing: row.processing_count.toString(),
            succeeded: row.succeeded_count.toString(),
            failed: row.failed_count.toString(),
            cancelled: row.cancelled_count.toString(),
          },
        };
      });
    });
  }

  async listPayments(query: AdminPaymentQueryDto) {
    const result = await this.reports.findPayments(query);
    return {
      items: (result.items as Array<Record<string, unknown> & { amount: bigint }>).map((payment) => ({
        ...payment,
        amount: payment.amount.toString(),
        failureReason: undefined,
      })),
      ...this.pagination(query, result.total),
    };
  }

  private async cached<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as T;
    const value = await factory();
    await this.redis.set(key, JSON.stringify(value), REPORT_CACHE_TTL_SECONDS);
    return value;
  }

  private cacheSuffix(query: AggregateReportQueryDto): string {
    return [query.period, query.from ?? '', query.to ?? ''].join(':');
  }

  private pagination(query: AdminPaginationQueryDto, total: number) {
    return { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
  }

  private toUser(user: { id: string; name: string; email: string; balance: bigint; version: number; createdAt: Date; updatedAt: Date }) {
    return { ...user, balance: user.balance.toString() };
  }

  private sumByType(
    rows: AdminTransactionSummary[],
    type: TransactionType,
  ) {
    const row = rows.find((item) => item.type === type);
    return {
      amount: this.bigIntString(row?._sum?.amount),
      count: this.groupCount(row?._count),
    };
  }

  private countByStatus(
    rows: AdminPaymentSummary[],
    status: PaymentStatus,
  ): number {
    return this.groupCount(rows.find((item) => item.status === status)?._count);
  }

  private groupCount(
    count: { _all?: number } | boolean | null | undefined,
  ): number {
    return isObject(count) ? (count as { _all?: number })._all ?? 0 : 0;
  }

  private bigIntString(value: bigint | null | undefined): string {
    return (value ?? 0n).toString();
  }

  private usagePercent(debited: bigint | null, credited: bigint | null): number {
    const credit = Number(credited ?? 0n);
    if (credit === 0) return 0;
    return Number(((Number(debited ?? 0n) / credit) * 100).toFixed(2));
  }
}
