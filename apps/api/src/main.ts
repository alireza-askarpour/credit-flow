import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { EnvironmentVariables } from '@app/config';
import { HttpExceptionFilter } from '@app/common';
import { securityHeadersMiddleware } from './security/security-headers.middleware';
import { ApiModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiModule);
  app.useLogger(app.get(Logger));
  app.use(securityHeadersMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.enableShutdownHooks();
  const configService = app.get(ConfigService<EnvironmentVariables>);
  const corsOrigins = configService.getOrThrow('app.cors_origins', { infer: true });
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: false,
  });
  await app.listen(configService.getOrThrow('app.port', { infer: true }));
}

void bootstrap();
