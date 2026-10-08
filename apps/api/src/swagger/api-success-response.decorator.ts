import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiResponse,
  ApiResponseOptions,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';

interface SuccessResponseOptions {
  status?: HttpStatus;
  type?: Type<unknown>;
  example?: unknown;
}

export const ApiSuccessResponse = ({
  status = HttpStatus.OK,
  type,
  example,
}: SuccessResponseOptions): MethodDecorator => {
  const options: ApiResponseOptions = {
    status,
    schema: example === undefined
      ? {
          properties: {
            success: { type: 'boolean', example: true },
            response: type ? { $ref: getSchemaPath(type) } : {},
            requestId: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        }
      : {
          example: {
            success: true,
            response: example,
            requestId: 'request-id',
            timestamp: '2026-10-08T00:00:00.000Z',
          },
        },
  };

  return applyDecorators(
    ...(type ? [ApiExtraModels(type)] : []),
    ApiResponse(options),
  );
};
