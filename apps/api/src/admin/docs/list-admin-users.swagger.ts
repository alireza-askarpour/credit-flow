import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';

export const ApiListAdminUsers = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'List users and balances' }),
    ApiOkResponse({
      schema: {
        example: {
          items: [{ id: 'uuid', name: 'Ali Ahmadi', email: 'ali@example.com', balance: '100000', version: 1 }],
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
    ),
  );
