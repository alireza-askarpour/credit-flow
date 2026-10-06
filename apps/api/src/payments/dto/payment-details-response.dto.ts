import { PaymentStatus } from '@app/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentDetailsResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'uuid' })
  userId!: string;
  @ApiProperty({ example: '100000' })
  amount!: string;
  @ApiProperty()
  reference!: string;
  @ApiPropertyOptional()
  description?: string;
  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;
  @ApiPropertyOptional()
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
