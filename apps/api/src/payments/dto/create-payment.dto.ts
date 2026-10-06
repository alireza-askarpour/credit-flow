import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 100000, description: 'Integer amount in تومان/ریال units' })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount!: number;

  @ApiProperty({ example: 'ORDER_123' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/)
  @Transform(sanitizeText)
  reference!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(sanitizeText)
  description?: string;
}
