import { EnvironmentVariables } from './interfaces/config.interface';
import { ErrorCode, isNumber, isUndefined } from '@app/common';

const parseBoolean = (value: string | undefined, fallback = false): boolean =>
  isUndefined(value) ? fallback : value === 'true';

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return isNumber(parsed) ? parsed : fallback;
};

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${ErrorCode.MISSING_ENVIRONMENT_VARIABLE}_${name}`);
  }
  return value;
};

export const config = (): EnvironmentVariables => ({
  app: {
    id: process.env.APP_ID ?? 'credit-flow',
    port: parseNumber(process.env.APP_PORT, 3000),
    mode: process.env.NODE_ENV ?? 'development',
    domain: process.env.APP_DOMAIN,
    api_prefix: 'api/v1',
    cors_origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
      : [],
    swagger_enabled: parseBoolean(
      process.env.APP_SWAGGER_ENABLED,
      process.env.NODE_ENV !== 'production',
    ),
    swagger_path: process.env.APP_SWAGGER_PATH ?? 'docs',
  },
  worker: {
    id: process.env.WORKER_ID ?? process.env.HOSTNAME ?? 'worker',
    port: parseNumber(process.env.WORKER_PORT, 3001),
  },
  db: {
    url: required('DATABASE_URL'),
    host: process.env.DB_HOST,
    port: process.env.DB_PORT
      ? parseNumber(process.env.DB_PORT, 5432)
      : undefined,
    user: process.env.DB_USERNAME,
    pass: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  redis: {
    url: required('REDIS_URL'),
  },
  rabbitmq: {
    url: required('RABBITMQ_URL'),
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  admin: {
    api_key: required('ADMIN_API_KEY'),
  },
  simulation: {
    enabled: parseBoolean(process.env.PAYMENT_SIMULATION_ENABLED, true),
    max_amount: parseNumber(process.env.PAYMENT_SIMULATION_MAX_AMOUNT, 1_000_000),
    seed: process.env.PAYMENT_SIMULATION_SEED,
  },
});
