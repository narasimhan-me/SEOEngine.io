import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

// Cloudflare Turnstile test secret key for development
// See: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const DEV_SECRET_KEY = '1x0000000000000000000000000000000AA'; // Always passes

@Injectable()
export class CaptchaService {
  private readonly secretKey: string;
  private readonly provider: string;

  constructor(private configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('CAPTCHA_SECRET_KEY') || DEV_SECRET_KEY;
    this.provider =
      this.configService.get<string>('CAPTCHA_PROVIDER') || 'turnstile';
  }

  /**
   * Verify a CAPTCHA token with the provider
   * @param token The token from the client-side widget
   * @param remoteIp Optional IP address of the user
   * @returns true if valid
   * @throws BadRequestException if invalid
   */
  async verify(token: string, remoteIp?: string): Promise<boolean> {
    if (!token) {
      throw new BadRequestException('CAPTCHA token is required');
    }

    if (this.provider === 'turnstile') {
      return this.verifyTurnstile(token, remoteIp);
    }

    throw new BadRequestException(
      `Unsupported CAPTCHA provider: ${this.provider}`
    );
  }

  private async verifyTurnstile(
    token: string,
    remoteIp?: string
  ): Promise<boolean> {
    const formData = new URLSearchParams();
    formData.append('secret', this.secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    try {
      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        }
      );

      const result = (await response.json()) as TurnstileVerifyResponse;

      if (!result.success) {
        const errors = result['error-codes']?.join(', ') || 'Unknown error';
        console.warn(`Turnstile verification failed: ${errors}`);
        throw new BadRequestException(
          'CAPTCHA verification failed. Please try again.'
        );
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Turnstile verification error:', error);
      throw new BadRequestException(
        'CAPTCHA verification failed. Please try again.'
      );
    }
  }
}
