import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from '@app/common';
import { ApiModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiModule);
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
