import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

interface RequestWithId {
  id?: string;
}

interface SuccessResponse<T> {
  success: true;
  response: T;
  requestId?: string;
  timestamp: string;
}

@Injectable()
export class HttpResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<RequestWithId>();

    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        response: data,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
