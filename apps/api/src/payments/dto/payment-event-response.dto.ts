import { PaymentStatus } from '@app/common';

export class PaymentEventResponseDto {
  id!: string;
  eventType!: string;
  previousStatus?: PaymentStatus;
  newStatus?: PaymentStatus;
  attemptNumber?: number;
  createdAt!: Date;
}
