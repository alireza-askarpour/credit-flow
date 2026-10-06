import { IsEnum, IsOptional } from 'class-validator';
import { PaymentStatus } from '@app/common';
import { AdminPaginationQueryDto } from './admin-pagination-query.dto';

export class AdminPaymentQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
