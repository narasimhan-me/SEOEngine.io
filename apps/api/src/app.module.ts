import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ShopifyModule } from './shopify/shopify.module';
import { ProjectsModule } from './projects/projects.module';
import { ProductsModule } from './products/products.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SeoScanModule } from './seo-scan/seo-scan.module';
import { AiModule } from './ai/ai.module';
import { TwoFactorAuthModule } from './two-factor-auth/two-factor-auth.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { CaptchaModule } from './captcha/captcha.module';
import { ContactModule } from './contact/contact.module';
import { CrawlModule } from './crawl/crawl.module';
import { RedisModule } from './infra/redis/redis.module';
import { AccountModule } from './account/account.module';
import { E2eTestkitController } from './testkit/e2e-testkit.controller';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    CaptchaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ShopifyModule,
    ProjectsModule,
    ProductsModule,
    IntegrationsModule,
    SeoScanModule,
    AiModule,
    TwoFactorAuthModule,
    BillingModule,
    AdminModule,
    ContactModule,
    CrawlModule,
    AccountModule,
  ],
  controllers: [E2eTestkitController],
  providers: [PrismaService],
})
export class AppModule {}
