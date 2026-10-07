import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { config, EnvironmentVariables, envValidationSchema } from '@app/config';
import { HealthModule } from '@app/health';
import { MessagingModule } from '@app/messaging';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { HttpExceptionFilter } from '@app/common';
import { UsersModule } from './users/users.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { createApiPinoHttpConfig } from './logging/pino-http.config';

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
        pinoHttp: createApiPinoHttpConfig({
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
    UsersModule,
    PaymentsModule,
    AdminModule,
  ],
  providers: [HttpExceptionFilter],
})
export class ApiModule {}
