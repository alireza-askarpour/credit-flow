import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentListQueryDto } from './dto/payment-list-query.dto';
import { PaymentListResponseDto } from './dto/payment-list-response.dto';
import { PaymentsService } from './payments.service';
import { ApiListUserPayments } from './docs/list-user-payments.swagger';

@Controller('users')
@ApiTags('payments')
export class UserPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get(':userId/payments')
  @ApiListUserPayments()
  findByUser(
    @Param('userId') userId: string,
    @Query() query: PaymentListQueryDto,
  ): Promise<PaymentListResponseDto> {
    return this.payments.findByUser(userId, query);
  }
}
