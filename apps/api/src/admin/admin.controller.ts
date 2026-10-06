import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AdminApiKeyGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminPaginationQueryDto } from './dto/admin-pagination-query.dto';
import { AdminTransactionQueryDto } from './dto/admin-transaction-query.dto';
import { AdminPaymentQueryDto } from './dto/admin-payment-query.dto';
import { AggregateReportQueryDto } from './dto/aggregate-report-query.dto';

@Controller('admin')
@UseGuards(AdminApiKeyGuard)
@ApiTags('admin')
@ApiSecurity('adminApiKey')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List users and balances' })
  listUsers(@Query() query: AdminPaginationQueryDto) {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get an account summary' })
  getUser(@Param('id') id: string) {
    return this.admin.getUser(id);
  }

  @Get('users/:id/transactions')
  @ApiOperation({ summary: 'List a user transactions' })
  listUserTransactions(
    @Param('id') id: string,
    @Query() query: AdminTransactionQueryDto,
  ) {
    return this.admin.listUserTransactions(id, query);
  }

  @Get('reports/aggregate')
  @ApiOperation({ summary: 'Aggregate credits and debits by period' })
  aggregate(@Query() query: AggregateReportQueryDto) {
    return this.admin.aggregate(query);
  }

  @Get('reports/usage')
  @ApiOperation({ summary: 'Get balance usage by user' })
  usage() {
    return this.admin.usage();
  }

  @Get('payments')
  @ApiOperation({ summary: 'List all payment requests' })
  listPayments(@Query() query: AdminPaymentQueryDto) {
    return this.admin.listPayments(query);
  }
}
