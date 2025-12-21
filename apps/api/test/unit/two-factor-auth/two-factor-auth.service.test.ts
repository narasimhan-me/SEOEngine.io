/**
 * Unit tests for TwoFactorAuthService
 *
 * Tests:
 * - setupInit() generates secret and QR code
 * - setupInit() throws when user not found
 * - enable() enables 2FA after verification
 * - enable() throws when setup not initialized
 * - enable() throws when code is invalid
 * - disable() disables 2FA
 * - disable() verifies code when provided
 * - verifyToken() verifies TOTP tokens
 */
import { TwoFactorAuthService } from '../../../src/two-factor-auth/two-factor-auth.service';
import { PrismaService } from '../../../src/prisma.service';
import { BadRequestException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

// Mock speakeasy and QRCode
jest.mock('speakeasy');
jest.mock('qrcode');

const createPrismaMock = () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
});

describe('TwoFactorAuthService', () => {
  let service: TwoFactorAuthService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new TwoFactorAuthService(prismaMock as unknown as PrismaService);
    jest.clearAllMocks();
  });

  describe('setupInit', () => {
    it('should generate secret and QR code for user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        twoFactorSecret: null,
        twoFactorEnabled: false,
      };

      const mockSecret = {
        base32: 'MFRGG43FMFRGG43FMFRGG43FMFRGG43F',
        otpauth_url: 'otpauth://totp/SEOEngine.io:test@example.com?secret=MFRGG43FMFRGG43FMFRGG43FMFRGG43F&issuer=SEOEngine.io',
      };

      const mockQrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQrCode);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        twoFactorSecret: mockSecret.base32,
      });

      const result = await service.setupInit('user-1');

      expect(result).toHaveProperty('otpauthUrl', mockSecret.otpauth_url);
      expect(result).toHaveProperty('qrCodeDataUrl', mockQrCode);
      expect(speakeasy.generateSecret).toHaveBeenCalledWith({
        name: 'SEOEngine.io:test@example.com',
        issuer: 'SEOEngine.io',
        length: 32,
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          twoFactorSecret: mockSecret.base32,
          twoFactorEnabled: false,
        },
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.setupInit('user-1')).rejects.toThrow(BadRequestException);
      await expect(service.setupInit('user-1')).rejects.toThrow('User not found');
    });
  });

  describe('enable', () => {
    it('should enable 2FA after verifying code', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        twoFactorSecret: 'MFRGG43FMFRGG43FMFRGG43FMFRGG43F',
        twoFactorEnabled: false,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: true,
      });

      const result = await service.enable('user-1', '123456');

      expect(result).toEqual({ success: true });
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: mockUser.twoFactorSecret,
        encoding: 'base32',
        token: '123456',
        window: 1,
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          twoFactorEnabled: true,
        },
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.enable('user-1', '123456')).rejects.toThrow(BadRequestException);
      await expect(service.enable('user-1', '123456')).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException when setup not initialized', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        twoFactorSecret: null,
        twoFactorEnabled: false,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.enable('user-1', '123456')).rejects.toThrow(BadRequestException);
      await expect(service.enable('user-1', '123456')).rejects.toThrow(
        '2FA setup not initialized',
      );
    });

    it('should throw BadRequestException when code is invalid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        twoFactorSecret: 'MFRGG43FMFRGG43FMFRGG43FMFRGG43F',
        twoFactorEnabled: false,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.enable('user-1', 'invalid-code')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.enable('user-1', 'invalid-code')).rejects.toThrow(
        'Invalid verification code',
      );
    });
  });

  describe('disable', () => {
    it('should disable 2FA without code', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        twoFactorSecret: 'MFRGG43FMFRGG43FMFRGG43FMFRGG43F',
        twoFactorEnabled: true,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });

      const result = await service.disable('user-1');

      expect(result).toEqual({ success: true });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      });
    });

    it('should verify code before disabling when code is provided', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        twoFactorSecret: 'MFRGG43FMFRGG43FMFRGG43FMFRGG43F',
        twoFactorEnabled: true,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });

      const result = await service.disable('user-1', '123456');

      expect(result).toEqual({ success: true });
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: mockUser.twoFactorSecret,
        encoding: 'base32',
        token: '123456',
        window: 1,
      });
    });

    it('should throw BadRequestException when code is invalid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        twoFactorSecret: 'MFRGG43FMFRGG43FMFRGG43FMFRGG43F',
        twoFactorEnabled: true,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.disable('user-1', 'invalid-code')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.disable('user-1', 'invalid-code')).rejects.toThrow(
        'Invalid verification code',
      );
    });

    it('should throw BadRequestException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.disable('user-1')).rejects.toThrow(BadRequestException);
      await expect(service.disable('user-1')).rejects.toThrow('User not found');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid TOTP token', () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = service.verifyToken('MFRGG43FMFRGG43FMFRGG43FMFRGG43F', '123456');

      expect(result).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'MFRGG43FMFRGG43FMFRGG43FMFRGG43F',
        encoding: 'base32',
        token: '123456',
        window: 1,
      });
    });

    it('should return false for invalid token', () => {
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = service.verifyToken('MFRGG43FMFRGG43FMFRGG43FMFRGG43F', 'invalid');

      expect(result).toBe(false);
    });
  });
});

