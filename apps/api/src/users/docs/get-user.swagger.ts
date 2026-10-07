import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ErrorCode } from '@app/common';
import { UserResponseDto } from '../dto/user-response.dto';
import { ApiErrorResponses } from '../../swagger/api-error-response.decorator';

export const ApiGetUser = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Get user details and balance' }),
    ApiOkResponse({ type: UserResponseDto }),
    ApiErrorResponses(
      { status: HttpStatus.BAD_REQUEST, messages: ['VALIDATION_ERROR'] },
      { status: HttpStatus.NOT_FOUND, messages: [ErrorCode.USER_NOT_FOUND] },
    ),
  );
