export enum PaymentEvent {
  CREATED = 'payment.created',
  QUEUED = 'payment.queued',
  PROCESSING_STARTED = 'payment.processing_started',
  SUCCEEDED = 'payment.succeeded',
  FAILED = 'payment.failed',
  RETRY_TRIGGERED = 'payment.retry_triggered',
  CANCELLED = 'payment.cancelled',
}
