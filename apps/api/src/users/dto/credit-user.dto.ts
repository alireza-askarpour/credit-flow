import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class CreditUserDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount!: number;
}
