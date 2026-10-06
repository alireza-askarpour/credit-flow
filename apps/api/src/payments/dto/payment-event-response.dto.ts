import { PaymentStatus } from '@app/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentEventResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  eventType!: string;
  @ApiPropertyOptional({ enum: PaymentStatus })
  previousStatus?: PaymentStatus;
  @ApiPropertyOptional({ enum: PaymentStatus })
  newStatus?: PaymentStatus;
  @ApiPropertyOptional()
  attemptNumber?: number;
  @ApiProperty()
  createdAt!: Date;
}
