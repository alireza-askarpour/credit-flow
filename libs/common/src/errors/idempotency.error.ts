import { DomainError } from './domain.error';
import { ErrorCode } from './error-code.enum';

export class IdempotencyConflictError extends DomainError {
  constructor(idempotencyKey: string) {
    super(
      ErrorCode.PAYMENT_IDEMPOTENCY_CONFLICT,
      ErrorCode.PAYMENT_IDEMPOTENCY_CONFLICT,
      { idempotencyKey },
    );
  }
}
