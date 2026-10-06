import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(WorkerModule);
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  await app.listen(process.env.WORKER_PORT ?? 3001);
}

void bootstrap();
