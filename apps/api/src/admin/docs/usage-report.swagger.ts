import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';

export const ApiUsageReport = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Get balance usage by user' }),
    ApiOkResponse({
      schema: {
        example: [{
          user: { id: 'uuid', name: 'Ali Ahmadi', email: 'ali@example.com' },
          currentBalance: '100000',
          totalCredited: '500000',
          totalDebited: '400000',
          usagePercent: 80,
          paymentCounts: { total: '3', pending: '0', queued: '0', processing: '0', succeeded: '2', failed: '1', cancelled: '0' },
        }],
      },
    }),
    ApiErrorResponses({
      status: HttpStatus.UNAUTHORIZED,
      messages: [ErrorCode.VALID_ADMIN_API_KEY_REQUIRED],
    }),
  );
