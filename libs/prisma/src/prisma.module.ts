import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  PaymentEventRepository,
  PaymentRequestRepository,
  TransactionRepository,
  UserRepository,
} from './repositories';

@Global()
@Module({
  providers: [
    PrismaService,
    UserRepository,
    PaymentRequestRepository,
    TransactionRepository,
    PaymentEventRepository,
  ],
  exports: [
    PrismaService,
    UserRepository,
    PaymentRequestRepository,
    TransactionRepository,
    PaymentEventRepository,
  ],
})
export class PrismaModule {}
