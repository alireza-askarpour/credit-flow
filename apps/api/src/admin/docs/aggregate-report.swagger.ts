import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';

export const ApiAggregateReport = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Aggregate credits and debits by period' }),
    ApiOkResponse({
      schema: {
        example: [{ period: '2026-10-08T00:00:00.000Z', totalCredits: '500000', totalDebits: '250000', creditCount: '5', debitCount: '2' }],
      },
    }),
    ApiErrorResponses(
      { status: HttpStatus.BAD_REQUEST, messages: ['VALIDATION_ERROR'] },
      { status: HttpStatus.UNAUTHORIZED, messages: [ErrorCode.VALID_ADMIN_API_KEY_REQUIRED] },
    ),
  );
