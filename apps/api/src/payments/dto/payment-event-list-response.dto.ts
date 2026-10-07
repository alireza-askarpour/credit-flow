import { ApiProperty } from '@nestjs/swagger';
import { PaymentEventResponseDto } from './payment-event-response.dto';

export class PaymentEventListResponseDto {
  @ApiProperty({ type: PaymentEventResponseDto, isArray: true })
  items!: PaymentEventResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
