import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { UserResponseDto } from '../dto/user-response.dto';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';
import { ApiSuccessResponse } from '../../swagger/api-success-response.decorator';

export const ApiCreateUser = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Create a user account' }),
    ApiSuccessResponse({ status: HttpStatus.CREATED, type: UserResponseDto }),
    ApiErrorResponses({
      status: HttpStatus.BAD_REQUEST,
      messages: [ErrorCode.INITIAL_BALANCE_MUST_BE_SAFE_INTEGER, 'VALIDATION_ERROR'],
    }),
  );
