export class CreatePaymentDto {
  userId!: string;
  amount!: string;
  currency!: string;
  idempotencyKey!: string;
}
