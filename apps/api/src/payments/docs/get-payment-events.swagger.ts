import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { PaymentEventResponseDto } from '../dto/payment-event-response.dto';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';

export const ApiGetPaymentEvents = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Get append-only payment event history' }),
    ApiOkResponse({ type: PaymentEventResponseDto, isArray: true }),
    ApiErrorResponses({
      status: HttpStatus.NOT_FOUND,
      messages: [ErrorCode.PAYMENT_NOT_FOUND],
    }),
  );
