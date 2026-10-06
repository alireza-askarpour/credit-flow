import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@app/config';
import { ErrorCode } from '@app/common';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const providedKey = request.headers['x-admin-api-key'];
    const expectedKey = this.config.getOrThrow('admin.api_key', { infer: true });

    if (!providedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException(ErrorCode.VALID_ADMIN_API_KEY_REQUIRED);
    }
    return true;
  }
}
