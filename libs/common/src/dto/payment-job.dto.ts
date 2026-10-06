import { PaymentEvent } from '../enums/payment-event.enum';

export class PaymentJobDto {
  event!: PaymentEvent;
  paymentId!: string;
  userId!: string;
  attempt!: number;
}
