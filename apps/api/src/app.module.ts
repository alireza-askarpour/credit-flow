import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { config, EnvironmentVariables, envValidationSchema } from '@app/config';
import { HealthModule } from '@app/health';
import { MessagingModule } from '@app/messaging';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { HttpExceptionFilter, isString } from '@app/common';
import { UsersModule } from './users/users.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';

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
          genReqId: (request) => {
            const requestId = request.headers['x-request-id'];
            return isString(requestId) ? requestId : randomUUID();
          },
          customProps: (request) => ({ requestId: request.id }),
        },
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
