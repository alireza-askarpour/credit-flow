import { PaymentStatus } from '../enums/payment-status.enum';
import { ErrorCode } from './error-code.enum';
import { FailureType } from '../enums/failure-type.enum';
import { PaymentProcessingError } from './payment-processing.error';

export class PaymentStateTransitionError extends PaymentProcessingError {
  constructor(from: PaymentStatus, to: PaymentStatus) {
    super(
      ErrorCode.PAYMENT_INVALID_STATE_TRANSITION,
      FailureType.BUSINESS,
      { from, to },
    );
  }
}
