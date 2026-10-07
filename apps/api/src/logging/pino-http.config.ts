import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { createPinoTransport } from '@app/config';
import { isString } from '@app/common';

type RequestLike = IncomingMessage & { id?: unknown };
type ResponseLike = ServerResponse<IncomingMessage>;

const requestIdOf = (request: RequestLike): unknown => request.id;

export const createApiPinoHttpConfig = (
  environment: { app: { mode: string }; logging: { level: string } },
) => ({
  level: environment.logging.level,
  transport: createPinoTransport(environment.app.mode),
  genReqId: (request: RequestLike): string => {
    const requestId = request.headers['x-request-id'];
    return isString(requestId) ? requestId : randomUUID();
  },
  customProps: (request: RequestLike) => ({ requestId: requestIdOf(request) }),
  quietReqLogger: true,
  serializers: {
    req: (request: RequestLike) => ({
      id: requestIdOf(request),
      method: request.method,
      url: request.url,
    }),
    res: (response: ResponseLike) => ({ statusCode: response.statusCode }),
  },
  autoLogging: {
    ignore: (request: RequestLike): boolean => {
      const path = (request.url ?? '').split('?')[0] ?? '';
      return ['/', '/favicon.ico'].includes(path);
    },
  },
});
