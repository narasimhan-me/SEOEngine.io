import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
