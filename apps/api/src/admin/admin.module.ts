import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminApiKeyGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminApiKeyGuard],
})
export class AdminModule {}
