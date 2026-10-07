import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { PaymentEventListResponseDto } from '../dto/payment-event-list-response.dto';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';

export const ApiGetPaymentEvents = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Get append-only payment event history' }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number' }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: 'Items per page' }),
    ApiOkResponse({ type: PaymentEventListResponseDto }),
    ApiErrorResponses({
      status: HttpStatus.NOT_FOUND,
      messages: [ErrorCode.PAYMENT_NOT_FOUND],
    }),
  );
