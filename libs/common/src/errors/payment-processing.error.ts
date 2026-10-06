import { FailureType } from '../enums/failure-type.enum';
import { DomainError } from './domain.error';

export class PaymentProcessingError extends DomainError {
  constructor(
    message: string,
    public readonly failureType: FailureType,
    code: string,
  ) {
    super(message, code);
  }
}

export class InsufficientBalanceError extends PaymentProcessingError {
  constructor() {
    super(
      'User balance is insufficient',
      FailureType.BUSINESS,
      'INSUFFICIENT_BALANCE',
    );
  }
}

export function classifyPaymentError(error: unknown): FailureType {
  return error instanceof PaymentProcessingError
    ? error.failureType
    : FailureType.TECHNICAL;
}
