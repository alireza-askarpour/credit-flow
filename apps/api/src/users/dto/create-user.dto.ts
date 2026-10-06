import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { sanitizeText } from '../../security/sanitize-input';

export class CreateUserDto {
  @ApiProperty({ example: 'Ali Ahmadi' })
  @IsString()
  @IsNotEmpty()
  @Transform(sanitizeText)
  name!: string;

  @ApiProperty({ example: 'ali@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 500000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  initialBalance?: number;
}
