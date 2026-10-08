import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { PaymentSubmissionResponseDto } from '../dto/payment-submission-response.dto';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';
import { ApiSuccessResponse } from '../../swagger/api-success-response.decorator';

export const ApiSubmitPayment = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Submit an asynchronous payment request' }),
    ApiHeader({ name: 'Idempotency-Key', required: true }),
    ApiSuccessResponse({ status: HttpStatus.ACCEPTED, type: PaymentSubmissionResponseDto }),
    ApiErrorResponses(
      { status: HttpStatus.BAD_REQUEST, messages: [ErrorCode.IDEMPOTENCY_KEY_REQUIRED, ErrorCode.AMOUNT_MUST_BE_POSITIVE_INTEGER, 'VALIDATION_ERROR'] },
      { status: HttpStatus.NOT_FOUND, messages: [ErrorCode.USER_NOT_FOUND] },
      { status: HttpStatus.CONFLICT, messages: [ErrorCode.IDEMPOTENCY_KEY_PAYLOAD_CONFLICT, ErrorCode.PAYMENT_ALREADY_BEING_CREATED, ErrorCode.PAYMENT_STATUS_CHANGED_CONCURRENTLY] },
      { status: HttpStatus.SERVICE_UNAVAILABLE, messages: [ErrorCode.PAYMENT_QUEUE_UNAVAILABLE] },
    ),
  );
