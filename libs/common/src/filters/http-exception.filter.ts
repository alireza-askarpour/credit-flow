import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ErrorCode } from '../errors/error-code.enum';
import { isArrayFull, isObject, isString } from '../utils/check.util';

interface RequestWithId {
  id?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<{
      status: (statusCode: number) => { json: (body: unknown) => void };
    }>();
    const request = context.getRequest<RequestWithId>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const rawMessage = getExceptionMessage(exceptionResponse, exception);
    const message = isArrayFull(rawMessage)
      ? rawMessage.map(toErrorCode).join(',')
      : toErrorCode(rawMessage);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error
          ? exception.stack ?? exception.message
          : exception,
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code: `HTTP_${status}`,
        message,
      },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  }
}

function getExceptionMessage(
  response: string | object | undefined,
  exception: unknown,
): unknown {
  if (isObject(response)) {
    return 'message' in response ? response.message : undefined;
  }
  if (exception instanceof HttpException) {
    return exception.message;
  }
  return ErrorCode.INTERNAL_SERVER_ERROR;
}

function toErrorCode(value: unknown): string {
  if (!isString(value)) {
    return ErrorCode.INTERNAL_SERVER_ERROR;
  }
  return (
    value
      ?.trim()
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase() || ErrorCode.INTERNAL_SERVER_ERROR
  );
}
