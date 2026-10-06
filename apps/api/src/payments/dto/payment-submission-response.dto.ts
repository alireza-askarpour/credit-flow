import { PaymentStatus } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentSubmissionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;
  @ApiProperty({ example: '100000' })
  amount!: string;
  @ApiProperty()
  reference!: string;
  @ApiProperty()
  createdAt!: Date;
}
