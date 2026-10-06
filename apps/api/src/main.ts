import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { EnvironmentVariables } from '@app/config';
import { HttpExceptionFilter } from '@app/common';
import { ApiModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiModule);
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.enableShutdownHooks();
  const configService = app.get(ConfigService<EnvironmentVariables>);
  await app.listen(configService.getOrThrow('app.port', { infer: true }));
}

void bootstrap();
