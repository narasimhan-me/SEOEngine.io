import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { PrismaService } from '../prisma.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'default-secret-change-in-production',
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [ShopifyController],
  providers: [ShopifyService, PrismaService],
  exports: [ShopifyService],
})
export class ShopifyModule {}
