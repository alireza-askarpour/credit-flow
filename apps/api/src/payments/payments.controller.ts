import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDetailsResponseDto } from './dto/payment-details-response.dto';
import { PaymentEventResponseDto } from './dto/payment-event-response.dto';
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

  @Get(':id')
  findById(@Param('id') id: string): Promise<PaymentDetailsResponseDto> {
    return this.payments.findById(id);
  }

  @Get(':id/events')
  findEvents(@Param('id') id: string): Promise<PaymentEventResponseDto[]> {
    return this.payments.findEvents(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string): Promise<PaymentDetailsResponseDto> {
    return this.payments.cancel(id);
  }
}
