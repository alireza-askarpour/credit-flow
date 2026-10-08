import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const ApiGetHealth = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Check API dependencies health' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'All dependencies are healthy',
      schema: {
        example: {
          success: true,
          response: {
            status: 'ok',
            checks: {
              database: 'ok',
              redis: 'ok',
              rabbitmq: 'ok',
            },
          },
          requestId: 'request-id',
          timestamp: '2026-10-08T00:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      description: 'One or more dependencies are unavailable',
      schema: {
        example: {
          success: false,
          error: {
            code: 'HTTP_503',
            message: 'SERVICE_UNAVAILABLE',
          },
          requestId: 'request-id',
          timestamp: '2026-10-08T00:00:00.000Z',
        },
      },
    }),
  );
