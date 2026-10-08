import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';
import { ApiSuccessResponse } from '../../swagger/api-success-response.decorator';

export const ApiListAdminUsers = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'List users and balances' }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiQuery({ name: 'filterString', required: false, type: String, example: 'balance:gte:100000' }),
    ApiQuery({ name: 'sortString', required: false, type: String, example: 'createdAt:desc' }),
    ApiSuccessResponse({
      example: {
          items: [{ id: 'uuid', name: 'Ali Ahmadi', email: 'ali@example.com', balance: '100000', version: 1 }],
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
      },
    }),
    ApiErrorResponses(
      { status: HttpStatus.BAD_REQUEST, messages: ['VALIDATION_ERROR'] },
      { status: HttpStatus.UNAUTHORIZED, messages: [ErrorCode.VALID_ADMIN_API_KEY_REQUIRED] },
    ),
  );
