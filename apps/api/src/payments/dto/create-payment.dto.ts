import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { sanitizeText } from '../../security/sanitize-input';

export class CreatePaymentDto {
  @IsUUID()
  userId!: string;

  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/)
  @Transform(sanitizeText)
  reference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(sanitizeText)
  description?: string;
}
