import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
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
    PaymentRequestRepository,
    TransactionRepository,
    PaymentEventRepository,
    UserRepository,
    AdminReportRepository,
  ],
  exports: [
    PrismaService,
    UserRepository,
    PaymentRequestRepository,
    TransactionRepository,
    PaymentEventRepository,
    AdminReportRepository,
  ],
})
export class PrismaModule {}
