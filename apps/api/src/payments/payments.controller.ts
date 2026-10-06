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
import {
  ApiAcceptedResponse,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDetailsResponseDto } from './dto/payment-details-response.dto';
import { PaymentEventResponseDto } from './dto/payment-event-response.dto';
import { PaymentSubmissionResponseDto } from './dto/payment-submission-response.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@ApiTags('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Submit an asynchronous payment request' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiAcceptedResponse({ type: PaymentSubmissionResponseDto })
  submit(
    @Body() dto: CreatePaymentDto,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ): Promise<PaymentSubmissionResponseDto> {
    return this.payments.submit(dto, idempotencyKey);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment status and details' })
  @ApiResponse({ status: 200, type: PaymentDetailsResponseDto })
  findById(@Param('id') id: string): Promise<PaymentDetailsResponseDto> {
    return this.payments.findById(id);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Get append-only payment event history' })
  @ApiResponse({ status: 200, type: PaymentEventResponseDto, isArray: true })
  findEvents(@Param('id') id: string): Promise<PaymentEventResponseDto[]> {
    return this.payments.findEvents(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending or queued payment' })
  @ApiResponse({ status: 200, type: PaymentDetailsResponseDto })
  cancel(@Param('id') id: string): Promise<PaymentDetailsResponseDto> {
    return this.payments.cancel(id);
  }
}
