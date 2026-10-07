import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaQueryFilterService } from './query-filter.service';
import {
  PaymentEventRepository,
  PaymentRequestRepository,
  TransactionRepository,
  UserRepository,
  AdminReportRepository,
} from './repositories';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaQueryFilterService,
    PaymentRequestRepository,
    TransactionRepository,
    PaymentEventRepository,
    UserRepository,
    AdminReportRepository,
  ],
  exports: [
    PrismaService,
    PrismaQueryFilterService,
    UserRepository,
    PaymentRequestRepository,
    TransactionRepository,
    PaymentEventRepository,
    AdminReportRepository,
  ],
})
export class PrismaModule {}
