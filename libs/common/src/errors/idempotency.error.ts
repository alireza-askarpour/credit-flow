import { DomainError } from './domain.error';

export class IdempotencyConflictError extends DomainError {
  constructor(idempotencyKey: string) {
    super(
      `A payment already exists for idempotency key ${idempotencyKey}`,
      'PAYMENT_IDEMPOTENCY_CONFLICT',
      { idempotencyKey },
    );
  }
}
