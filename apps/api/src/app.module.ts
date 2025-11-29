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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
