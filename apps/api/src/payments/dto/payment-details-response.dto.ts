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
  @ApiProperty({ example: 0 })
  retryCount!: number;
  @ApiProperty({ example: 3 })
  maxAttempts!: number;
  @ApiPropertyOptional({ format: 'date-time' })
  nextRetryAt?: Date;
  @ApiPropertyOptional({ format: 'date-time' })
  queuedAt?: Date;
  @ApiPropertyOptional({ format: 'date-time' })
  processingStartedAt?: Date;
  @ApiPropertyOptional({ format: 'date-time' })
  completedAt?: Date;
  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
