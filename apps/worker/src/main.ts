import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(WorkerModule);
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);
  await app.listen(configService.get<number>('worker.port', 3001));
}

void bootstrap();
