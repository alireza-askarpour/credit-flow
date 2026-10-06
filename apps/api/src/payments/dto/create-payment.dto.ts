import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const sanitize = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim()
    : value;

export class CreatePaymentDto {
  @IsUUID()
  userId!: string;

  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/)
  reference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(sanitize)
  description?: string;
}
