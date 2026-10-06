import { PaymentStatus } from '../enums/payment-status.enum';

export class PaymentResponseDto {
  id!: string;
  userId!: string;
  amount!: string;
  currency!: string;
  status!: PaymentStatus;
  createdAt!: Date;
  updatedAt!: Date;
}
