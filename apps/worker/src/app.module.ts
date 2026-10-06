import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { config, EnvironmentVariables, envValidationSchema } from '@app/config';
import { HealthModule } from '@app/health';
import { MessagingModule } from '@app/messaging';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { PaymentFailureSimulator } from './payment-failure-simulator.service';
import { PaymentWorkerService } from './payment-worker.service';

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
        pinoHttp: {
          level: configService.getOrThrow('logging.level', { infer: true }),
        },
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
