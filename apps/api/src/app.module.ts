import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ShopifyModule } from './shopify/shopify.module';
import { ProjectsModule } from './projects/projects.module';
import { IntegrationsModule } from './integrations/integrations.module';

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
    IntegrationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
