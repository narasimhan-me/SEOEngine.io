import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [AuthModule, ShopifyModule],
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
  exports: [AdminService],
})
export class AdminModule {}
