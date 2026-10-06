import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentSubmissionResponseDto } from './dto/payment-submission-response.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  submit(
    @Body() dto: CreatePaymentDto,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ): Promise<PaymentSubmissionResponseDto> {
    return this.payments.submit(dto, idempotencyKey);
  }
}
