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
import { sanitizeText } from '../../security/sanitize-input';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Transform(sanitizeText)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  initialBalance?: number;
}
