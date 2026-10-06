import { PaymentStatus } from '../enums/payment-status.enum';
import { DomainError } from './domain.error';
import { ErrorCode } from './error-code.enum';

export class PaymentStateTransitionError extends DomainError {
  constructor(from: PaymentStatus, to: PaymentStatus) {
    super(
      ErrorCode.PAYMENT_INVALID_STATE_TRANSITION,
      ErrorCode.PAYMENT_INVALID_STATE_TRANSITION,
      { from, to },
    );
  }
}
