import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  APP_ID: Joi.string().default('credit-flow'),
  APP_PORT: Joi.number().port().default(3000),
  APP_DOMAIN: Joi.string().allow('').optional(),
  CORS_ORIGINS: Joi.string().allow('').optional(),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  WORKER_PORT: Joi.number().port().default(3001),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),
  RABBITMQ_URL: Joi.string()
    .uri({ scheme: ['amqp', 'amqps'] })
    .required(),
  DB_HOST: Joi.string().optional(),
  DB_PORT: Joi.number().port().optional(),
  DB_USERNAME: Joi.string().optional(),
  DB_PASSWORD: Joi.string().optional(),
  DB_NAME: Joi.string().optional(),
});
