import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AdminApiKeyGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { PaymentListQueryDto } from '../payments/dto/payment-list-query.dto';
import { AggregateReportQueryDto } from './dto/aggregate-report-query.dto';
import { ApiListAdminUsers } from './docs/list-admin-users.swagger';
import { ApiGetAdminUser } from './docs/get-admin-user.swagger';
import { ApiListAdminTransactions } from './docs/list-admin-transactions.swagger';
import { ApiAggregateReport } from './docs/aggregate-report.swagger';
import { ApiUsageReport } from './docs/usage-report.swagger';
import { ApiListAdminPayments } from './docs/list-admin-payments.swagger';

@Controller('admin')
@UseGuards(AdminApiKeyGuard)
@ApiTags('admin')
@ApiSecurity('adminApiKey')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  @ApiListAdminUsers()
  listUsers(@Query() query: PaymentListQueryDto) {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  @ApiGetAdminUser()
  getUser(@Param('id') id: string) {
    return this.admin.getUser(id);
  }

  @Get('users/:id/transactions')
  @ApiListAdminTransactions()
  listUserTransactions(
    @Param('id') id: string,
    @Query() query: PaymentListQueryDto,
  ) {
    return this.admin.listUserTransactions(id, query);
  }

  @Get('reports/aggregate')
  @ApiAggregateReport()
  aggregate(@Query() query: AggregateReportQueryDto) {
    return this.admin.aggregate(query);
  }

  @Get('reports/usage')
  @ApiUsageReport()
  usage() {
    return this.admin.usage();
  }

  @Get('payments')
  @ApiListAdminPayments()
  listPayments(@Query() query: PaymentListQueryDto) {
    return this.admin.listPayments(query);
  }
}
