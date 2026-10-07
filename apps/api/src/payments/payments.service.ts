import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  $Enums,
} from '@prisma/client';
import {
  ErrorCode,
  isEqual,
  isNull,
  PaymentEvent,
  PaymentStatus,
  buildPaginatedResponse,
} from '@app/common';
import {
  UserRepository,
  PaymentRequestRepository,
} from '@app/prisma';
import { RedisService } from '@app/redis';
import { MessagingService } from '@app/messaging';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentListQueryDto } from './dto/payment-list-query.dto';
import { PaymentListResponseDto } from './dto/payment-list-response.dto';
import { PaymentEventListResponseDto } from './dto/payment-event-list-response.dto';
import { PaymentDetailsResponseDto } from './dto/payment-details-response.dto';
import { PaymentSubmissionResponseDto } from './dto/payment-submission-response.dto';

const IDEMPOTENCY_TTL_SECONDS = 300;

const PAYMENT_STATUS_MAP: Record<$Enums.PaymentRequestStatus, PaymentStatus> = {
  [$Enums.PaymentRequestStatus.PENDING]: PaymentStatus.PENDING,
  [$Enums.PaymentRequestStatus.QUEUED]: PaymentStatus.QUEUED,
  [$Enums.PaymentRequestStatus.PROCESSING]: PaymentStatus.PROCESSING,
  [$Enums.PaymentRequestStatus.SUCCEEDED]: PaymentStatus.SUCCEEDED,
  [$Enums.PaymentRequestStatus.FAILED]: PaymentStatus.FAILED,
  [$Enums.PaymentRequestStatus.CANCELLED]: PaymentStatus.CANCELLED,
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly payments: PaymentRequestRepository,
    private readonly users: UserRepository,
    private readonly redis: RedisService,
    private readonly messaging: MessagingService,
  ) {}

  async submit(
    dto: CreatePaymentDto,
    idempotencyKey: string | undefined,
  ): Promise<PaymentSubmissionResponseDto> {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException(ErrorCode.IDEMPOTENCY_KEY_REQUIRED);
    }
    if (!Number.isSafeInteger(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException(ErrorCode.AMOUNT_MUST_BE_POSITIVE_INTEGER);
    }

    const existing = await this.payments.findByIdempotencyKey(key);
    if (existing) {
      return this.resolveExisting(existing, dto);
    }

    const existingPayment = await this.acquireIdempotencyLock(key, dto);
    if (existingPayment) {
      return existingPayment;
    }

    const lockKey = this.getIdempotencyLockKey(key);

    let cacheResult = false;
    try {
      const user = await this.users.findById(dto.userId);
      if (!user) {
        throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
      }

      const paymentRequest = await this.payments.createWithCreatedEvent({
        userId: dto.userId,
        amount: BigInt(dto.amount),
        reference: dto.reference,
        description: dto.description,
        idempotencyKey: key,
        maxAttempts: 3,
      });

      try {
        await this.messaging.publishPaymentJob({
          event: PaymentEvent.QUEUED,
          paymentId: paymentRequest.id,
          userId: paymentRequest.userId,
          attempt: paymentRequest.retryCount,
        });
      } catch {
        throw new ServiceUnavailableException(ErrorCode.PAYMENT_QUEUE_UNAVAILABLE);
      }

      const transitioned = await this.payments.transitionStatusWithEvent(
        paymentRequest.id,
        PaymentStatus.PENDING,
        PaymentStatus.QUEUED,
        'QUEUED',
        { source: 'api', failureType: null },
        0,
      );
      if (!transitioned) {
        throw new ConflictException(ErrorCode.PAYMENT_STATUS_CHANGED_CONCURRENTLY);
      }

      await this.redis.set(
        lockKey,
        paymentRequest.id,
        IDEMPOTENCY_TTL_SECONDS,
      );
      cacheResult = true;

      return this.toResponse({
        ...paymentRequest,
        status: PaymentStatus.QUEUED,
      });
    } finally {
      if (!cacheResult) {
        await this.redis.delete(lockKey);
      }
    }
  }

  async findById(id: string): Promise<PaymentDetailsResponseDto> {
    const payment = await this.payments.findById(id);
    if (!payment) {
      throw new NotFoundException(ErrorCode.PAYMENT_NOT_FOUND);
    }

    return this.toDetailsResponse(payment);
  }

  async findEvents(
    id: string,
    query: PaymentListQueryDto,
  ): Promise<PaymentEventListResponseDto> {
    const payment = await this.payments.findById(id);
    if (!payment) {
      throw new NotFoundException(ErrorCode.PAYMENT_NOT_FOUND);
    }

    const result = await this.payments.findEventsByPaymentRequestId(
      id,
      query,
    );

    return buildPaginatedResponse(
      result.items.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        previousStatus: this.toPaymentStatus(event.previousStatus),
        newStatus: this.toPaymentStatus(event.newStatus),
        attemptNumber: event.attemptNumber ?? undefined,
        createdAt: event.createdAt,
      })),
      query,
      result.total,
    );
  }

  async findByUser(
    userId: string,
    query: PaymentListQueryDto,
  ): Promise<PaymentListResponseDto> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
    }

    const { items, total } = await this.payments.findByUser(userId, {
      page: query.page,
      limit: query.limit,
      filterString: query.filterString,
      sortString: query.sortString,
    });

    return buildPaginatedResponse(
      items.map((item) => this.toDetailsResponse(item)),
      query,
      total,
    );
  }

  async cancel(id: string): Promise<PaymentDetailsResponseDto> {
    const payment = await this.payments.findById(id);
    if (!payment) {
      throw new NotFoundException(ErrorCode.PAYMENT_NOT_FOUND);
    }

    const cancelledFromPending = await this.payments.transitionStatusWithEvent(
      id,
      PaymentStatus.PENDING,
      PaymentStatus.CANCELLED,
      'CANCELLED',
      { source: 'api', failureType: null },
    );
    const cancelled =
      cancelledFromPending ||
      (await this.payments.transitionStatusWithEvent(
        id,
        PaymentStatus.QUEUED,
        PaymentStatus.CANCELLED,
        'CANCELLED',
        { source: 'api', failureType: null },
      ));

    if (!cancelled) {
      throw new ConflictException(ErrorCode.PAYMENT_CANNOT_BE_CANCELLED);
    }

    return this.findById(id);
  }

  private resolveExisting(
    existing: {
      id: string;
      userId: string;
      amount: bigint;
      reference: string;
      description: string | null;
      status: $Enums.PaymentRequestStatus;
      createdAt: Date;
    },
    dto: CreatePaymentDto,
  ): PaymentSubmissionResponseDto {
    const matches =
      isEqual(existing.userId, dto.userId) &&
      isEqual(existing.amount, BigInt(dto.amount)) &&
      isEqual(existing.reference, dto.reference) &&
      isEqual(existing.description ?? undefined, dto.description);

    if (!matches) {
      throw new ConflictException(ErrorCode.IDEMPOTENCY_KEY_PAYLOAD_CONFLICT);
    }

    return this.toResponse({
      ...existing,
      status: this.toRequiredPaymentStatus(existing.status),
    });
  }

  private async acquireIdempotencyLock(
    idempotencyKey: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentSubmissionResponseDto | undefined> {
    const lockKey = this.getIdempotencyLockKey(idempotencyKey);
    const lock = await this.redis.setIfAbsent(
      lockKey,
      'locked',
      IDEMPOTENCY_TTL_SECONDS,
    );

    if (lock) {
      return undefined;
    }

    const racedPayment = await this.payments.findByIdempotencyKey(
      idempotencyKey,
    );
    if (racedPayment) {
      return this.resolveExisting(racedPayment, dto);
    }

    throw new ConflictException(ErrorCode.PAYMENT_ALREADY_BEING_CREATED);
  }

  private getIdempotencyLockKey(idempotencyKey: string): string {
    return `payment:idempotency:${idempotencyKey}`;
  }

  private toResponse(payment: {
    id: string;
    status: PaymentStatus;
    amount: bigint;
    reference: string;
    createdAt: Date;
  }): PaymentSubmissionResponseDto {
    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount.toString(),
      reference: payment.reference,
      createdAt: payment.createdAt,
    };
  }

  private toDetailsResponse(payment: {
    id: string;
    userId: string;
    amount: bigint;
    reference: string;
    description: string | null;
    status: $Enums.PaymentRequestStatus;
    failureType: $Enums.FailureType | null;
    retryCount: number;
    maxAttempts: number;
    nextRetryAt: Date | null;
    queuedAt: Date | null;
    processingStartedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentDetailsResponseDto {
    return {
      id: payment.id,
      userId: payment.userId,
      amount: payment.amount.toString(),
      reference: payment.reference,
      description: payment.description ?? undefined,
      status: this.toRequiredPaymentStatus(payment.status),
      failureCode: payment.failureType
        ? `PAYMENT_${payment.failureType}_FAILURE`
        : undefined,
      retryCount: payment.retryCount,
      maxAttempts: payment.maxAttempts,
      nextRetryAt: payment.nextRetryAt ?? undefined,
      queuedAt: payment.queuedAt ?? undefined,
      processingStartedAt: payment.processingStartedAt ?? undefined,
      completedAt: payment.completedAt ?? undefined,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private toPaymentStatus(
    status: $Enums.PaymentRequestStatus | null,
  ): PaymentStatus | undefined {
    return isNull(status) ? undefined : PAYMENT_STATUS_MAP[status];
  }

  private toRequiredPaymentStatus(
    status: $Enums.PaymentRequestStatus,
  ): PaymentStatus {
    return PAYMENT_STATUS_MAP[status];
  }
}
