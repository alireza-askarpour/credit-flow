import { FailureType } from '../enums/failure-type.enum';
import { DomainError } from './domain.error';
import { ErrorCode } from './error-code.enum';

export class PaymentProcessingError extends DomainError {
  constructor(
    code: string,
    public readonly failureType: FailureType,
  ) {
    super(code, code);
  }
}

export class InsufficientBalanceError extends PaymentProcessingError {
  constructor() {
    super(
      ErrorCode.INSUFFICIENT_BALANCE,
      FailureType.BUSINESS,
    );
  }
}

export function classifyPaymentError(error: unknown): FailureType {
  return error instanceof PaymentProcessingError
    ? error.failureType
    : FailureType.TECHNICAL;
}
