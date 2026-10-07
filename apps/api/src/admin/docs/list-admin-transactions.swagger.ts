import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';

export const ApiListAdminTransactions = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'List user transactions' }),
    ApiOkResponse({
      schema: {
        example: {
          items: [{ id: 'uuid', userId: 'user-uuid', amount: '100000', reference: 'ORDER_123', type: 'CREDIT', balanceAfter: '200000' }],
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
    }),
    ApiErrorResponses(
      { status: HttpStatus.BAD_REQUEST, messages: ['VALIDATION_ERROR'] },
      { status: HttpStatus.UNAUTHORIZED, messages: [ErrorCode.VALID_ADMIN_API_KEY_REQUIRED] },
      { status: HttpStatus.NOT_FOUND, messages: [ErrorCode.USER_NOT_FOUND] },
    ),
  );
