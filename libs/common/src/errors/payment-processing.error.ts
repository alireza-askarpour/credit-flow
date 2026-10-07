import { FailureType } from '../enums/failure-type.enum';
import { DomainError } from './domain.error';
import { ErrorCode } from './error-code.enum';
import { isIn, isObject, isString } from '../utils/check.util';

const BUSINESS_ERROR_CODES = [
  ErrorCode.INSUFFICIENT_BALANCE,
  ErrorCode.PAYMENT_INVALID_STATE_TRANSITION,
  ErrorCode.PAYMENT_NOT_IN_PROCESSING_STATE,
];

export class PaymentProcessingError extends DomainError {
  constructor(
    code: string,
    public readonly failureType: FailureType,
    details?: Record<string, unknown>,
  ) {
    super(code, code, details);
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

export class PaymentNotInProcessingStateError extends PaymentProcessingError {
  constructor() {
    super(
      ErrorCode.PAYMENT_NOT_IN_PROCESSING_STATE,
      FailureType.BUSINESS,
    );
  }
}

export function classifyPaymentError(error: unknown): FailureType {
  if (error instanceof PaymentProcessingError) {
    return error.failureType;
  }

  return isIn(resolveThrownErrorCode(error), BUSINESS_ERROR_CODES)
    ? FailureType.BUSINESS
    : FailureType.TECHNICAL;
}

export function resolvePaymentErrorCode(error: unknown): string {
  if (error instanceof PaymentProcessingError) {
    return error.code;
  }

  const thrownErrorCode = resolveThrownErrorCode(error);
  return isIn(thrownErrorCode, BUSINESS_ERROR_CODES) && thrownErrorCode
    ? thrownErrorCode
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

function resolveThrownErrorCode(error: unknown): string | undefined {
  if (isObject(error) && 'code' in error && isString(error.code)) {
    return error.code;
  }

  return error instanceof Error ? error.message : undefined;
}
