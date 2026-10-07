import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { PaymentListResponseDto } from '../dto/payment-list-response.dto';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';

export const ApiListUserPayments = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'List a user payment requests' }),
    ApiOkResponse({ type: PaymentListResponseDto }),
    ApiErrorResponses(
      { status: HttpStatus.BAD_REQUEST, messages: ['VALIDATION_ERROR'] },
      { status: HttpStatus.NOT_FOUND, messages: [ErrorCode.USER_NOT_FOUND] },
    ),
  );
