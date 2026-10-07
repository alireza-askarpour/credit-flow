import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { LoggerModule } from 'nestjs-pino';

import { RedisModule } from '@app/redis';
import { HealthModule } from '@app/health';
import { PrismaModule } from '@app/prisma';
import { MessagingModule } from '@app/messaging';
import { config, EnvironmentVariables, envValidationSchema } from '@app/config';

import { createWorkerPinoConfig } from './logging/pino.config';
import { PaymentWorkerService } from './payment-worker.service';
import { PaymentFailureSimulator } from './payment-failure-simulator.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
      load: [config],
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => ({
        pinoHttp: createWorkerPinoConfig({
          app: { mode: configService.getOrThrow('app.mode', { infer: true }) },
          logging: {
            level: configService.getOrThrow('logging.level', { infer: true }),
          },
        }),
      }),
    }),
    PrismaModule,
    RedisModule,
    MessagingModule,
    HealthModule,
  ],
  providers: [PaymentFailureSimulator, PaymentWorkerService],
})
export class WorkerModule {}
