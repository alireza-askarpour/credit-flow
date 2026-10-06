import { EnvironmentVariables } from './interfaces/config.interface';

const parseBoolean = (value: string | undefined, fallback = false): boolean =>
  value === undefined ? fallback : value === 'true';

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
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
  },
  worker: {
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
  simulation: {
    enabled: parseBoolean(process.env.PAYMENT_SIMULATION_ENABLED, true),
    max_amount: parseNumber(process.env.PAYMENT_SIMULATION_MAX_AMOUNT, 1_000_000),
    seed: process.env.PAYMENT_SIMULATION_SEED,
  },
});
