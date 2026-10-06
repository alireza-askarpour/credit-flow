import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { config, EnvironmentVariables, envValidationSchema } from '@app/config';
import { HealthModule } from '@app/health';
import { MessagingModule } from '@app/messaging';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';

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
          level: configService.get<string>('logging.level', 'info'),
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    MessagingModule,
    HealthModule,
  ],
})
export class WorkerModule {}
