import {
  Catch,
  Logger,
  HttpStatus,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
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
    const response = this.getResponse(context);
    const request = context.getRequest<RequestWithId>();
    const status = this.getStatus(exception);
    const message = this.getMessage(exception);

    this.logException(exception, status);

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

  private getResponse(context: ReturnType<ArgumentsHost['switchToHttp']>): {
    status: (statusCode: number) => { json: (body: unknown) => void };
  } {
    return context.getResponse<{
      status: (statusCode: number) => { json: (body: unknown) => void };
    }>();
  }

  private getStatus(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown): string {
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const rawMessage = this.getRawMessage(exceptionResponse, exception);

    return isArrayFull(rawMessage)
      ? rawMessage.map(toErrorCode).join(',')
      : toErrorCode(rawMessage);
  }

  private getRawMessage(
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

  private logException(exception: unknown, status: number): void {
    if (status < HttpStatus.INTERNAL_SERVER_ERROR) {
      return;
    }

    this.logger.error(
      exception instanceof Error
        ? exception.stack ?? exception.message
        : exception,
    );
  }
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
