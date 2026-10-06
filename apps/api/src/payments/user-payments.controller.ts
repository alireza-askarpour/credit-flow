import { Controller, Get, Param, Query } from '@nestjs/common';
import { PaymentListQueryDto } from './dto/payment-list-query.dto';
import { PaymentListResponseDto } from './dto/payment-list-response.dto';
import { PaymentsService } from './payments.service';

@Controller('users')
export class UserPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get(':userId/payments')
  findByUser(
    @Param('userId') userId: string,
    @Query() query: PaymentListQueryDto,
  ): Promise<PaymentListResponseDto> {
    return this.payments.findByUser(userId, query);
  }
}
