import { PaymentStatus } from '@app/common';

export class PaymentDetailsResponseDto {
  id!: string;
  userId!: string;
  amount!: string;
  reference!: string;
  description?: string;
  status!: PaymentStatus;
  failureCode?: string;
  retryCount!: number;
  maxAttempts!: number;
  nextRetryAt?: Date;
  queuedAt?: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
