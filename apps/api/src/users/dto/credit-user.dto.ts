import { IsNotEmpty, Matches } from 'class-validator';

export class CreditUserDto {
  @IsNotEmpty()
  @Matches(/^[1-9]\d*$/)
  amount!: string;
}
