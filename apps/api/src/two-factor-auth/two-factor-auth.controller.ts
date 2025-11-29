import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';

@Controller('2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorAuthController {
  constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

  /**
   * Initialize 2FA setup.
   * Returns a QR code and otpauth URL for the user to scan with their authenticator app.
   *
   * TODO: Add rate limiting to prevent abuse
   */
  @Post('setup-init')
  @HttpCode(HttpStatus.OK)
  async setupInit(@Request() req: any) {
    return this.twoFactorAuthService.setupInit(req.user.id);
  }

  /**
   * Enable 2FA after verifying a TOTP code.
   *
   * TODO: Add rate limiting to prevent brute-force attacks on the verification code
   */
  @Post('enable')
  @HttpCode(HttpStatus.OK)
  async enable(@Request() req: any, @Body() dto: Enable2faDto) {
    return this.twoFactorAuthService.enable(req.user.id, dto.code);
  }

  /**
   * Disable 2FA.
   * Optionally accepts a TOTP code for extra security.
   *
   * TODO: Add rate limiting
   */
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disable(@Request() req: any, @Body() dto: Disable2faDto) {
    return this.twoFactorAuthService.disable(req.user.id, dto.code);
  }
}
