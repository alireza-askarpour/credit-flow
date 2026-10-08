import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { UserResponseDto } from '../dto/user-response.dto';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';
import { ApiSuccessResponse } from '../../swagger/api-success-response.decorator';

export const ApiCreditUser = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Add credit to a user balance' }),
    ApiSuccessResponse({ status: HttpStatus.CREATED, type: UserResponseDto }),
    ApiErrorResponses(
      { status: HttpStatus.BAD_REQUEST, messages: [ErrorCode.AMOUNT_MUST_BE_POSITIVE_INTEGER, 'VALIDATION_ERROR'] },
      { status: HttpStatus.NOT_FOUND, messages: [ErrorCode.USER_NOT_FOUND] },
    ),
  );
