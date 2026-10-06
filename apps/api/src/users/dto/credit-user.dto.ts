import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreditUserDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  amount!: number;
}
