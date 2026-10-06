import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { TransactionType } from '@app/common';
import { AdminPaginationQueryDto } from './admin-pagination-query.dto';

export class AdminTransactionQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
