import { Module, forwardRef } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { ProjectsModule } from '../projects/projects.module';

/**
 * [SELF-SERVICE-1] Account Module
 *
 * Provides customer-facing self-service endpoints for:
 * - Profile management (name, avatar, timezone, locale, organization name)
 * - Preferences (notification toggles, default behaviors)
 * - AI Usage visibility (monthly summary, reuse effectiveness)
 * - Connected stores (derived from Projects + Shopify Integration)
 * - Session management (active sessions, sign-out-all)
 *
 * Hard rule: No AI calls, no job enqueueing from these endpoints.
 *
 * [ROLES-3 FIXUP-5] Imports ProjectsModule for RoleResolutionService access
 * to support co-owner disconnect-store operations.
 */
@Module({
  imports: [AuthModule, BillingModule, forwardRef(() => ProjectsModule)],
  controllers: [AccountController],
  providers: [AccountService, PrismaService],
  exports: [AccountService],
})
export class AccountModule {}
