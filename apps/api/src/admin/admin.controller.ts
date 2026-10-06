import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminApiKeyGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminPaginationQueryDto } from './dto/admin-pagination-query.dto';
import { AdminTransactionQueryDto } from './dto/admin-transaction-query.dto';
import { AdminPaymentQueryDto } from './dto/admin-payment-query.dto';
import { AggregateReportQueryDto } from './dto/aggregate-report-query.dto';

@Controller('admin')
@UseGuards(AdminApiKeyGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers(@Query() query: AdminPaginationQueryDto) {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.admin.getUser(id);
  }

  @Get('users/:id/transactions')
  listUserTransactions(
    @Param('id') id: string,
    @Query() query: AdminTransactionQueryDto,
  ) {
    return this.admin.listUserTransactions(id, query);
  }

  @Get('reports/aggregate')
  aggregate(@Query() query: AggregateReportQueryDto) {
    return this.admin.aggregate(query);
  }

  @Get('reports/usage')
  usage() {
    return this.admin.usage();
  }

  @Get('payments')
  listPayments(@Query() query: AdminPaymentQueryDto) {
    return this.admin.listPayments(query);
  }
}
