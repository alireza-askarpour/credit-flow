import { PaymentDetailsResponseDto } from './payment-details-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentListResponseDto {
  @ApiProperty({ type: PaymentDetailsResponseDto, isArray: true })
  items!: PaymentDetailsResponseDto[];
  @ApiProperty({ example: 1 })
  page!: number;
  @ApiProperty({ example: 20 })
  limit!: number;
  @ApiProperty({ example: 1 })
  total!: number;
  @ApiProperty({ example: 1 })
  totalPages!: number;
}
