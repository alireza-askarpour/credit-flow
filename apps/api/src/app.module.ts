import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { envValidationSchema } from '@app/config';
import { HealthModule } from '@app/health';
import { MessagingModule } from '@app/messaging';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { HttpExceptionFilter } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (request) => {
          const requestId = request.headers['x-request-id'];
          return typeof requestId === 'string' ? requestId : randomUUID();
        },
        customProps: (request) => ({ requestId: request.id }),
      },
    }),
    PrismaModule,
    RedisModule,
    MessagingModule,
    HealthModule,
  ],
  providers: [HttpExceptionFilter],
})
export class ApiModule {}
