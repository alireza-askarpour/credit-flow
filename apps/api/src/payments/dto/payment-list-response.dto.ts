import { PaymentDetailsResponseDto } from './payment-details-response.dto';

export class PaymentListResponseDto {
  items!: PaymentDetailsResponseDto[];
  page!: number;
  limit!: number;
  total!: number;
  totalPages!: number;
}
