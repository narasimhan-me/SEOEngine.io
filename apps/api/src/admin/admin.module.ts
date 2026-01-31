import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { ActivationSignalsModule } from '../activation/activation-signals.module';

/**
 * [EA-37] Extended with ActivationSignalsModule for internal activation metrics.
 */
@Module({
  imports: [AuthModule, ShopifyModule, ActivationSignalsModule],
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
  exports: [AdminService],
})
export class AdminModule {}
