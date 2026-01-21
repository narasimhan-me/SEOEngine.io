import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CaptchaService } from '../captcha/captcha.service';
import { AuthAbuseService } from '../captcha/auth-abuse.service';

class SignupDto {
  email: string;
  password: string;
  name?: string;
  captchaToken: string;
}

class LoginDto {
  email: string;
  password: string;
  captchaToken?: string;
}

class TwoFactorVerifyDto {
  tempToken: string;
  code: string;
}

// Custom error with code for frontend to detect CAPTCHA requirement
class CaptchaRequiredError extends UnauthorizedException {
  constructor(message: string) {
    super({ message, code: 'CAPTCHA_REQUIRED' });
  }
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService,
    private readonly authAbuseService: AuthAbuseService
  ) {}

  private getClientIp(req: Request): string | undefined {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress
    );
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: SignupDto, @Req() req: Request) {
    // CAPTCHA always required for signup
    await this.captchaService.verify(dto.captchaToken, this.getClientIp(req));

    const user = await this.authService.signup(
      dto.email,
      dto.password,
      dto.name
    );
    return user;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const clientIp = this.getClientIp(req);

    // Check if CAPTCHA is required for this email
    const captchaRequired = this.authAbuseService.isCaptchaRequired(dto.email);

    if (captchaRequired) {
      if (!dto.captchaToken) {
        throw new CaptchaRequiredError(
          'CAPTCHA verification required. Please complete the CAPTCHA.'
        );
      }
      // Verify CAPTCHA
      await this.captchaService.verify(dto.captchaToken, clientIp);
    }

    try {
      const result = await this.authService.login(dto.email, dto.password);
      // Success - clear failed attempts
      this.authAbuseService.clearFailures(dto.email);
      return result;
    } catch (error) {
      // Record failure on invalid credentials
      if (error instanceof UnauthorizedException) {
        this.authAbuseService.recordFailure(dto.email);

        // Check if CAPTCHA is now required after this failure
        if (this.authAbuseService.isCaptchaRequired(dto.email)) {
          throw new CaptchaRequiredError(
            'Too many failed attempts. Please complete the CAPTCHA.'
          );
        }
      }
      throw error;
    }
  }

  /**
   * Verify 2FA code during login.
   * This endpoint does NOT require authentication (uses tempToken instead).
   *
   * TODO: Add rate limiting to prevent brute-force attacks on TOTP codes
   */
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(@Body() dto: TwoFactorVerifyDto) {
    return this.authService.verifyTwoFactor(dto.tempToken, dto.code);
  }
}
