import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PaymentEvent, PaymentStatus } from '@app/common';
import {
  PaymentRequestRepository,
  UserRepository,
} from '@app/prisma';
import { RedisService } from '@app/redis';
import { MessagingService } from '@app/messaging';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentSubmissionResponseDto } from './dto/payment-submission-response.dto';

const IDEMPOTENCY_TTL_SECONDS = 300;

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
      throw new BadRequestException('Idempotency-Key header is required');
    }
    if (!Number.isSafeInteger(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException('Amount must be a positive integer');
    }

    const existing = await this.payments.findByIdempotencyKey(key);
    if (existing) {
      return this.resolveExisting(existing, dto);
    }

    const lockKey = `payment:idempotency:${key}`;
    const lock = await this.redis.setIfAbsent(
      lockKey,
      'locked',
      IDEMPOTENCY_TTL_SECONDS,
    );
    if (!lock) {
      const racedPayment = await this.payments.findByIdempotencyKey(key);
      if (racedPayment) {
        return this.resolveExisting(racedPayment, dto);
      }
      throw new ConflictException('Payment request is already being created');
    }

    let cacheResult = false;
    try {
      const user = await this.users.findById(dto.userId);
      if (!user) {
        throw new NotFoundException('User not found');
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
        throw new ServiceUnavailableException(
          'Payment queue is temporarily unavailable',
        );
      }

      const transitioned = await this.payments.transitionStatus(
        paymentRequest.id,
        PaymentStatus.PENDING,
        PaymentStatus.QUEUED,
      );
      if (!transitioned) {
        throw new ConflictException('Payment status changed concurrently');
      }

      await this.payments.recordEvent(
        paymentRequest.id,
        'QUEUED',
        'QUEUED',
      );
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

  private resolveExisting(
    existing: {
      id: string;
      userId: string;
      amount: bigint;
      reference: string;
      description: string | null;
      status: string;
      createdAt: Date;
    },
    dto: CreatePaymentDto,
  ): PaymentSubmissionResponseDto {
    const matches =
      existing.userId === dto.userId &&
      existing.amount === BigInt(dto.amount) &&
      existing.reference === dto.reference &&
      (existing.description ?? undefined) === dto.description;

    if (!matches) {
      throw new ConflictException(
        'Idempotency-Key was already used with a different payload',
      );
    }

    return this.toResponse(existing);
  }

  private toResponse(payment: {
    id: string;
    status: string;
    amount: bigint;
    reference: string;
    createdAt: Date;
  }): PaymentSubmissionResponseDto {
    return {
      id: payment.id,
      status: payment.status as PaymentStatus,
      amount: payment.amount.toString(),
      reference: payment.reference,
      createdAt: payment.createdAt,
    };
  }
}
