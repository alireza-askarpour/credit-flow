import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { EnvironmentVariables } from '@app/config';
import { WorkerModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(WorkerModule);
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  const configService = app.get(ConfigService<EnvironmentVariables>);
  await app.listen(configService.getOrThrow('worker.port', { infer: true }));
}

void bootstrap();
