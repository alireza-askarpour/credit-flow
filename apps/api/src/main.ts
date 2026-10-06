import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from '@app/common';
import { ApiModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiModule);
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);
  await app.listen(configService.get<number>('app.port', 3000));
}

void bootstrap();
