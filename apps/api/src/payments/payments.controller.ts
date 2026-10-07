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
import { ApiTags } from '@nestjs/swagger';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDetailsResponseDto } from './dto/payment-details-response.dto';
import { PaymentEventResponseDto } from './dto/payment-event-response.dto';
import { PaymentSubmissionResponseDto } from './dto/payment-submission-response.dto';
import { PaymentsService } from './payments.service';
import { ApiSubmitPayment } from './docs/submit-payment.swagger';
import { ApiGetPayment } from './docs/get-payment.swagger';
import { ApiGetPaymentEvents } from './docs/get-payment-events.swagger';
import { ApiCancelPayment } from './docs/cancel-payment.swagger';

@Controller('payments')
@ApiTags('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiSubmitPayment()
  submit(
    @Body() dto: CreatePaymentDto,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ): Promise<PaymentSubmissionResponseDto> {
    return this.payments.submit(dto, idempotencyKey);
  }

  @Get(':id')
  @ApiGetPayment()
  findById(@Param('id') id: string): Promise<PaymentDetailsResponseDto> {
    return this.payments.findById(id);
  }

  @Get(':id/events')
  @ApiGetPaymentEvents()
  findEvents(@Param('id') id: string): Promise<PaymentEventResponseDto[]> {
    return this.payments.findEvents(id);
  }

  @Post(':id/cancel')
  @ApiCancelPayment()
  cancel(@Param('id') id: string): Promise<PaymentDetailsResponseDto> {
    return this.payments.cancel(id);
  }
}
