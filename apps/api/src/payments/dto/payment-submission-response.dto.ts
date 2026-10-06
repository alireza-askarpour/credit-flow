import { PaymentStatus } from '@app/common';

export class PaymentSubmissionResponseDto {
  id!: string;
  status!: PaymentStatus;
  amount!: string;
  reference!: string;
  createdAt!: Date;
}
