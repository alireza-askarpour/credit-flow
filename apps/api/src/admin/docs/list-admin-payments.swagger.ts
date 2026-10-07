import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';

export const ApiListAdminPayments = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'List all payment requests' }),
    ApiOkResponse({
      schema: {
        example: {
          items: [{ id: 'uuid', userId: 'user-uuid', amount: '100000', reference: 'ORDER_123', status: 'SUCCEEDED' }],
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
