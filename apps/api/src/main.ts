import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { EnvironmentVariables } from '@app/config';
import { hasLength, HttpExceptionFilter, isString } from '@app/common';
import { securityHeadersMiddleware } from './security/security-headers.middleware';
import { ApiModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(securityHeadersMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.enableShutdownHooks();
  const configService = app.get(ConfigService<EnvironmentVariables>);
  if (configService.getOrThrow('app.swagger_enabled', { infer: true })) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Credit Flow API')
      .setDescription(
        'Asynchronous user credit and payment processing API. Money values are integer تومان/ریال units.',
      )
      .setVersion('1.0')
      .addApiKey(
        { type: 'apiKey', name: 'x-admin-api-key', in: 'header' },
        'adminApiKey',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(
      configService.getOrThrow('app.swagger_path', { infer: true }),
      app,
      document,
    );
  }
  const corsOrigins = configService.getOrThrow('app.cors_origins', { infer: true });
  app.enableCors({
    origin: hasLength(corsOrigins) ? corsOrigins : false,
    credentials: false,
  });
  await app.listen(configService.getOrThrow('app.port', { infer: true }));
}

void bootstrap();
