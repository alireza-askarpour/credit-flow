import { PaymentStatus } from '../enums/payment-status.enum';
import { DomainError } from './domain.error';

export class PaymentStateTransitionError extends DomainError {
  constructor(from: PaymentStatus, to: PaymentStatus) {
    super(
      `Invalid payment state transition from ${from} to ${to}`,
      'PAYMENT_INVALID_STATE_TRANSITION',
      { from, to },
    );
  }
}
