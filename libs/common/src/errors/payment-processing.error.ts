import { FailureType } from '../enums/failure-type.enum';
import { DomainError } from './domain.error';
import { ErrorCode } from './error-code.enum';
import { isObject, isString } from '../utils/check.util';

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

export function resolvePaymentErrorCode(error: unknown): string {
  return error instanceof PaymentProcessingError
    ? error.code
    : ErrorCode.PAYMENT_TECHNICAL_FAILURE;
}

export function resolvePaymentErrorOriginalCode(error: unknown): string {
  if (isObject(error) && 'code' in error && isString(error.code)) {
    return error.code;
  }

  return resolvePaymentErrorCode(error);
}

export function resolvePaymentErrorMessage(error: unknown): string {
  const databaseMessage = getDatabaseErrorMessage(error);
  if (databaseMessage) {
    return databaseMessage;
  }

  return error instanceof Error ? error.message : String(error);
}

function getDatabaseErrorMessage(error: unknown): string | undefined {
  if (!isObject(error) || !('meta' in error) || !isObject(error.meta)) {
    return undefined;
  }

  if (!('message' in error.meta) || !isString(error.meta.message)) {
    return undefined;
  }

  return error.meta.message;
}
