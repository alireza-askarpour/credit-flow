import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { PaymentDetailsResponseDto } from '../dto/payment-details-response.dto';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';
import { ApiSuccessResponse } from '../../swagger/api-success-response.decorator';

export const ApiGetPayment = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Get payment status and details' }),
    ApiSuccessResponse({ type: PaymentDetailsResponseDto }),
    ApiErrorResponses({
      status: HttpStatus.NOT_FOUND,
      messages: [ErrorCode.PAYMENT_NOT_FOUND],
    }),
  );
