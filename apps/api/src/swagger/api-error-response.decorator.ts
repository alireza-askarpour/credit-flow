import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

interface ApiErrorDefinition {
  status: HttpStatus;
  messages: readonly string[];
}

export const ApiErrorResponses = (
  ...definitions: ApiErrorDefinition[]
): MethodDecorator =>
  applyDecorators(
    ...[
      ...definitions,
      { status: HttpStatus.INTERNAL_SERVER_ERROR, messages: ['INTERNAL_SERVER_ERROR'] },
    ].map(({ status, messages }) =>
      ApiResponse({
        status,
        description: messages.join(', '),
        content: {
          'application/json': {
            examples: Object.fromEntries(
              messages.map((message) => [
                message,
                {
                  summary: message,
                  value: {
                    success: false,
                    error: {
                      code: `HTTP_${status}`,
                      message,
                    },
                    requestId: 'request-id',
                    timestamp: '2026-10-08T00:00:00.000Z',
                  },
                },
              ]),
            ),
          },
        },
      }),
    ),
  );
