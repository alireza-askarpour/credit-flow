import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { PaymentDetailsResponseDto } from '../dto/payment-details-response.dto';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';

export const ApiCancelPayment = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Cancel a pending or queued payment' }),
    ApiOkResponse({ type: PaymentDetailsResponseDto }),
    ApiErrorResponses(
      { status: HttpStatus.NOT_FOUND, messages: [ErrorCode.PAYMENT_NOT_FOUND] },
      { status: HttpStatus.CONFLICT, messages: [ErrorCode.PAYMENT_CANNOT_BE_CANCELLED] },
    ),
  );
