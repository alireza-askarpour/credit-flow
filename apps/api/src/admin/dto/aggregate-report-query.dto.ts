import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum AdminReportPeriodDto {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class AggregateReportQueryDto {
  @IsEnum(AdminReportPeriodDto)
  period!: AdminReportPeriodDto;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
