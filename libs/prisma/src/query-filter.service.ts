import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface PrismaFilterQuery {
  filterString?: string;
  sortString?: string;
  page: number;
  limit: number;
}

type Operator =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between'
  | 'like' | 'iLike' | 'notLike' | 'contains' | 'startsWith' | 'endsWith'
  | 'in' | 'notIn' | 'isNull' | 'isNotNull' | 'exists' | 'notExists';

interface Condition {
  field: string;
  operator: Operator;
  value: FilterValue;
}

type FilterScalar = string | number | bigint | boolean | null | Date;
type FilterValue = FilterScalar | FilterScalar[];

interface FieldConfig {
  type?: 'string' | 'number' | 'bigint' | 'boolean' | 'date' | 'enum';
}

interface ModelConfig {
  fields: Readonly<Record<string, FieldConfig>>;
}

const USER_CONFIG: ModelConfig = {
  fields: {
    id: {}, name: { type: 'string' }, email: { type: 'string' },
    balance: { type: 'bigint' }, version: { type: 'number' },
    createdAt: { type: 'date' }, updatedAt: { type: 'date' },
  },
};

const TRANSACTION_CONFIG: ModelConfig = {
  fields: {
    id: {}, userId: {}, paymentRequestId: {}, amount: { type: 'bigint' },
    reference: { type: 'string' }, type: { type: 'enum' },
    balanceAfter: { type: 'bigint' }, createdAt: { type: 'date' },
  },
};

const PAYMENT_CONFIG: ModelConfig = {
  fields: {
    id: {}, userId: {}, amount: { type: 'bigint' }, reference: { type: 'string' },
    description: { type: 'string' }, status: { type: 'enum' }, idempotencyKey: {},
    failureReason: { type: 'string' }, failureType: { type: 'enum' },
    retryCount: { type: 'number' }, maxAttempts: { type: 'number' },
    nextRetryAt: { type: 'date' }, queuedAt: { type: 'date' },
    processingStartedAt: { type: 'date' }, completedAt: { type: 'date' },
    createdAt: { type: 'date' }, updatedAt: { type: 'date' },
  },
};

@Injectable()
export class PrismaQueryFilterService {
  users(query: PrismaFilterQuery, base: Prisma.UserWhereInput = {}): Prisma.UserFindManyArgs {
    return this.build(query, USER_CONFIG, base);
  }

  transactions(query: PrismaFilterQuery, base: Prisma.TransactionWhereInput = {}): Prisma.TransactionFindManyArgs {
    return this.build(query, TRANSACTION_CONFIG, base);
  }

  payments(query: PrismaFilterQuery, base: Prisma.PaymentRequestWhereInput = {}): Prisma.PaymentRequestFindManyArgs {
    return this.build(query, PAYMENT_CONFIG, base);
  }

  private build<TWhere extends object>(
    query: PrismaFilterQuery,
    config: ModelConfig,
    base: TWhere,
  ): { where: TWhere; orderBy: Record<string, 'asc' | 'desc'>[]; skip: number; take: number } {
    const conditions = this.parseFilters(query.filterString, config);
    const whereParts = [base, ...conditions.map((condition) => this.toWhere(condition, config))];
    const where = { AND: whereParts } as TWhere;
    return {
      where,
      orderBy: this.parseSort(query.sortString, config),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    };
  }

  private parseFilters(value: string | undefined, config: ModelConfig): Condition[] {
    if (!value?.trim()) return [];
    return value.split(';').filter(Boolean).map((raw) => {
      const [field, operator, ...parts] = raw.split(':');
      if (!field || !operator || parts.length === 0) {
        throw new BadRequestException('INVALID_FILTER_FORMAT');
      }
      if (!config.fields[field]) throw new BadRequestException('FILTER_FIELD_NOT_ALLOWED');
      const normalized = operator as Operator;
      const allowed: Operator[] = [
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'like', 'iLike',
        'notLike', 'contains', 'startsWith', 'endsWith', 'in', 'notIn',
        'isNull', 'isNotNull', 'exists', 'notExists',
      ];
      if (!allowed.includes(normalized)) throw new BadRequestException('FILTER_OPERATOR_NOT_SUPPORTED');
      return { field, operator: normalized, value: this.parseValue(parts.join(':'), normalized, config.fields[field]) };
    });
  }

  private parseValue(value: string, operator: Operator, field: FieldConfig): Condition['value'] {
    if (['in', 'notIn'].includes(operator)) {
      return value.split(',').map((item) => this.convertScalar(item.trim(), field));
    }
    if (operator === 'between') {
      const values = value.split(',').map((item) => item.trim());
      if (values.length !== 2) throw new BadRequestException('FILTER_BETWEEN_REQUIRES_TWO_VALUES');
      return values.map((item) => this.convertScalar(item, field));
    }
    if (['isNull', 'isNotNull', 'exists', 'notExists'].includes(operator)) {
      return value.toLowerCase() === 'true';
    }
    return this.convertScalar(value, field);
  }

  private convertScalar(value: string, field: FieldConfig): FilterScalar {
    if (field.type === 'number') return this.numberValue(value);
    if (field.type === 'bigint') return BigInt(this.numberValue(value));
    if (field.type === 'boolean') return value.toLowerCase() === 'true';
    if (field.type === 'date') {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) throw new BadRequestException('INVALID_FILTER_DATE');
      return date;
    }
    return value;
  }

  private numberValue(value: string): number {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new BadRequestException('INVALID_FILTER_NUMBER');
    return number;
  }

  private toWhere(condition: Condition, config: ModelConfig): Record<string, unknown> {
    const field = config.fields[condition.field];
    if (!field) throw new BadRequestException('FILTER_FIELD_NOT_ALLOWED');
    const value = condition.value;
    switch (condition.operator) {
      case 'eq': return { [condition.field]: value };
      case 'neq': return { [condition.field]: { not: value } };
      case 'gt': return { [condition.field]: { gt: value } };
      case 'gte': return { [condition.field]: { gte: value } };
      case 'lt': return { [condition.field]: { lt: value } };
      case 'lte': return { [condition.field]: { lte: value } };
      case 'between':
        if (!Array.isArray(value)) throw new BadRequestException('FILTER_BETWEEN_REQUIRES_TWO_VALUES');
        return { [condition.field]: { gte: value[0], lte: value[1] } };
      case 'in': return { [condition.field]: { in: value } };
      case 'notIn': return { [condition.field]: { notIn: value } };
      case 'isNull':
      case 'notExists': return { [condition.field]: value === true ? null : { not: null } };
      case 'isNotNull':
      case 'exists': return { [condition.field]: value === true ? { not: null } : null };
      case 'like':
      case 'contains': return { [condition.field]: { contains: value } };
      case 'iLike': return { [condition.field]: { contains: value, mode: 'insensitive' } };
      case 'notLike': return { [condition.field]: { not: { contains: value } } };
      case 'startsWith': return { [condition.field]: { startsWith: value } };
      case 'endsWith': return { [condition.field]: { endsWith: value } };
    }
  }

  private parseSort(value: string | undefined, config: ModelConfig): Record<string, 'asc' | 'desc'>[] {
    if (!value?.trim()) return [{ createdAt: 'desc' }];
    return value.split(';').filter(Boolean).map((item) => {
      const [field, direction] = item.split(':');
      if (!field || !config.fields[field] || !['asc', 'desc'].includes(direction ?? '')) {
        throw new BadRequestException('INVALID_SORT_PARAMETER');
      }
      return { [field]: direction as 'asc' | 'desc' };
    });
  }
}
