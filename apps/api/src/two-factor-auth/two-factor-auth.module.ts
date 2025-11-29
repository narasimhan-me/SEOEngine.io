import { Module } from '@nestjs/common';
import { TwoFactorAuthController } from './two-factor-auth.controller';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [TwoFactorAuthController],
  providers: [TwoFactorAuthService, PrismaService],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}
