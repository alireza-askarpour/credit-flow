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
          status: 'ok',
          checks: {
            database: 'ok',
            redis: 'ok',
            rabbitmq: 'ok',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      description: 'One or more dependencies are unavailable',
      schema: {
        example: {
          status: 'degraded',
          checks: {
            database: 'down',
            redis: 'ok',
            rabbitmq: 'ok',
          },
        },
      },
    }),
  );
