import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';

export const ApiGetAdminUser = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Get an account summary' }),
    ApiOkResponse({
      schema: {
        example: {
          user: { id: 'uuid', name: 'Ali Ahmadi', email: 'ali@example.com', balance: '100000', version: 1 },
          summary: {
            totalCredited: '500000',
            totalDebited: '400000',
            creditTransactionCount: 2,
            debitTransactionCount: 1,
            paymentCounts: { PENDING: 0, QUEUED: 0, PROCESSING: 0, SUCCEEDED: 1, FAILED: 0, CANCELLED: 0 },
          },
        },
      },
    }),
    ApiErrorResponses(
      { status: HttpStatus.UNAUTHORIZED, messages: [ErrorCode.VALID_ADMIN_API_KEY_REQUIRED] },
      { status: HttpStatus.NOT_FOUND, messages: [ErrorCode.USER_NOT_FOUND] },
    ),
  );
