export const PAYMENT_QUEUE = 'credit-flow.payments';
export const PAYMENT_EXCHANGE = 'credit-flow';
export const PAYMENT_ROUTING_KEYS = {
  process: 'payment.process',
  deadLetter: 'payment.dlq',
} as const;

export const PAYMENT_RETRY_EXCHANGE = 'credit-flow.payments.retry';
export const PAYMENT_DEAD_LETTER_EXCHANGE = 'credit-flow.payments.dlx';
export const PAYMENT_DEAD_LETTER_QUEUE = 'credit-flow.payments.dlq';
export const PAYMENT_RETRY_QUEUES = [
  { name: 'credit-flow.payments.retry.5s', delayMs: 5_000 },
  { name: 'credit-flow.payments.retry.15s', delayMs: 15_000 },
  { name: 'credit-flow.payments.retry.60s', delayMs: 60_000 },
] as const;

export const QUEUE_PREFETCH_COUNT = 10;
