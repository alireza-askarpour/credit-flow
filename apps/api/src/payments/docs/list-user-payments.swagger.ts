import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { PaymentListResponseDto } from '../dto/payment-list-response.dto';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';
import { ApiSuccessResponse } from '../../swagger/api-success-response.decorator';

export const ApiListUserPayments = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'List a user payment requests' }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiQuery({ name: 'filterString', required: false, type: String, example: 'status:eq:FAILED' }),
    ApiQuery({ name: 'sortString', required: false, type: String, example: 'createdAt:desc' }),
    ApiSuccessResponse({ type: PaymentListResponseDto }),
    ApiErrorResponses(
      { status: HttpStatus.BAD_REQUEST, messages: ['VALIDATION_ERROR'] },
      { status: HttpStatus.NOT_FOUND, messages: [ErrorCode.USER_NOT_FOUND] },
    ),
  );
