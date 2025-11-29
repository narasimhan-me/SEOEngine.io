import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

export interface TwoFactorSetupResponse {
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

@Injectable()
export class TwoFactorAuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialize 2FA setup for a user.
   * Generates a TOTP secret and QR code, but does not enable 2FA yet.
   */
  async setupInit(userId: string): Promise<TwoFactorSetupResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate a new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `SEOEngine.io:${user.email}`,
      issuer: 'SEOEngine.io',
      length: 32,
    });

    // Store the secret (but keep 2FA disabled until verified)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false,
      },
    });

    // Generate QR code as data URL
    const otpauthUrl = secret.otpauth_url!;
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  /**
   * Enable 2FA after verifying a TOTP code.
   */
  async enable(userId: string, code: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA setup not initialized. Please call setup-init first.');
    }

    // Verify the TOTP code
    const isValid = this.verifyToken(user.twoFactorSecret, code);

    if (!isValid) {
      // TODO: Add rate limiting to prevent brute-force attacks
      throw new BadRequestException('Invalid verification code');
    }

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    });

    return { success: true };
  }

  /**
   * Disable 2FA for a user.
   * Optionally requires a TOTP code for extra security.
   */
  async disable(userId: string, code?: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // If a code is provided, verify it first
    if (code && user.twoFactorSecret) {
      const isValid = this.verifyToken(user.twoFactorSecret, code);
      if (!isValid) {
        throw new BadRequestException('Invalid verification code');
      }
    }

    // Disable 2FA and clear the secret
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    return { success: true };
  }

  /**
   * Verify a TOTP token against a user's secret.
   */
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1 step before/after for clock drift
    });
  }

  // TODO: Implement backup codes generation and verification
  // async generateBackupCodes(userId: string): Promise<string[]> { ... }
  // async verifyBackupCode(userId: string, code: string): Promise<boolean> { ... }
}
