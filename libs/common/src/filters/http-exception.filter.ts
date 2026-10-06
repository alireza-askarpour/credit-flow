import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ErrorCode } from '../errors/error-code.enum';
import { isObject, isString } from '../utils/check.util';

interface RequestWithId {
  id?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
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
    const rawMessage =
      isObject(exceptionResponse)
        ? (exceptionResponse as { message?: string | string[] }).message
        : exception instanceof HttpException
          ? exception.message
          : ErrorCode.INTERNAL_SERVER_ERROR;
    const message = Array.isArray(rawMessage)
      ? rawMessage.map(toErrorCode).join(',')
      : toErrorCode(rawMessage);

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
