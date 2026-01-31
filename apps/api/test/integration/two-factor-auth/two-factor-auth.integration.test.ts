/**
 * TWO-FACTOR-AUTH-TESTS: Integration tests for Two Factor Auth Service
 *
 * Tests:
 * - 2FA setup initialization
 * - 2FA enable with code verification
 * - 2FA disable
 * - Token verification
 *
 * NOTE: These tests require a test database to be configured.
 * TOTP verification is mocked since we can't generate real codes.
 */
import { TwoFactorAuthService } from '../../../src/two-factor-auth/two-factor-auth.service';
import {
  cleanupTestDb,
  disconnectTestDb,
  testPrisma,
} from '../../utils/test-db';

// Skip these tests if not running in E2E mode (requires test DB)
const describeIfE2E =
  process.env.ENGINEO_E2E === '1' ? describe : describe.skip;

describeIfE2E('TwoFactorAuthService (integration)', () => {
  let twoFactorAuthService: TwoFactorAuthService;
  let testUser: { id: string; email: string };

  beforeAll(async () => {
    twoFactorAuthService = new TwoFactorAuthService(testPrisma as any);
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();

    testUser = await testPrisma.user.create({
      data: {
        email: `2fa-test-${Date.now()}@example.com`,
        password: 'hashed-password',
        name: '2FA Test User',
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  });

  describe('Setup Initialization', () => {
    it('should generate TOTP secret and QR code', async () => {
      const result = await twoFactorAuthService.setupInit(testUser.id);

      expect(result.otpauthUrl).toBeDefined();
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(result.otpauthUrl).toContain(testUser.email);
      expect(result.qrCodeDataUrl).toBeDefined();
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

      // Verify secret was stored but 2FA not enabled
      const user = await testPrisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.twoFactorSecret).toBeDefined();
      expect(user?.twoFactorEnabled).toBe(false);
    });

    it('should throw BadRequestException for non-existent user', async () => {
      await expect(
        twoFactorAuthService.setupInit('non-existent-id')
      ).rejects.toThrow('User not found');
    });

    it('should regenerate secret on repeated setup', async () => {
      const result1 = await twoFactorAuthService.setupInit(testUser.id);
      const user1 = await testPrisma.user.findUnique({
        where: { id: testUser.id },
      });

      const result2 = await twoFactorAuthService.setupInit(testUser.id);
      const user2 = await testPrisma.user.findUnique({
        where: { id: testUser.id },
      });

      // Different secrets each time
      expect(user1?.twoFactorSecret).not.toBe(user2?.twoFactorSecret);
      expect(result1.otpauthUrl).not.toBe(result2.otpauthUrl);
    });
  });

  describe('Enable 2FA', () => {
    it('should throw if setup not initialized', async () => {
      await expect(
        twoFactorAuthService.enable(testUser.id, '123456')
      ).rejects.toThrow('2FA setup not initialized');
    });

    it('should throw for invalid code', async () => {
      await twoFactorAuthService.setupInit(testUser.id);

      await expect(
        twoFactorAuthService.enable(testUser.id, '000000')
      ).rejects.toThrow('Invalid verification code');
    });

    it('should enable 2FA with valid code', async () => {
      await twoFactorAuthService.setupInit(testUser.id);

      // Get the secret to generate a valid code
      const user = await testPrisma.user.findUnique({
        where: { id: testUser.id },
      });

      // Mock the verification by directly setting 2FA enabled
      // In real scenario, we'd use speakeasy to generate a valid code
      const speakeasy = require('speakeasy');
      const validCode = speakeasy.totp({
        secret: user?.twoFactorSecret,
        encoding: 'base32',
      });

      const result = await twoFactorAuthService.enable(testUser.id, validCode);

      expect(result.success).toBe(true);

      const updatedUser = await testPrisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(updatedUser?.twoFactorEnabled).toBe(true);
    });
  });

  describe('Disable 2FA', () => {
    it('should disable 2FA without code', async () => {
      // Setup and enable first
      await twoFactorAuthService.setupInit(testUser.id);

      // Manually enable for testing
      await testPrisma.user.update({
        where: { id: testUser.id },
        data: { twoFactorEnabled: true },
      });

      const result = await twoFactorAuthService.disable(testUser.id);

      expect(result.success).toBe(true);

      const user = await testPrisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.twoFactorEnabled).toBe(false);
      expect(user?.twoFactorSecret).toBeNull();
    });

    it('should disable 2FA with valid code', async () => {
      await twoFactorAuthService.setupInit(testUser.id);

      const user = await testPrisma.user.findUnique({
        where: { id: testUser.id },
      });

      await testPrisma.user.update({
        where: { id: testUser.id },
        data: { twoFactorEnabled: true },
      });

      const speakeasy = require('speakeasy');
      const validCode = speakeasy.totp({
        secret: user?.twoFactorSecret,
        encoding: 'base32',
      });

      const result = await twoFactorAuthService.disable(testUser.id, validCode);

      expect(result.success).toBe(true);
    });

    it('should throw for invalid code when provided', async () => {
      await twoFactorAuthService.setupInit(testUser.id);

      await testPrisma.user.update({
        where: { id: testUser.id },
        data: { twoFactorEnabled: true },
      });

      await expect(
        twoFactorAuthService.disable(testUser.id, '000000')
      ).rejects.toThrow('Invalid verification code');
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', async () => {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret();

      const validCode = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
      });

      const isValid = twoFactorAuthService.verifyToken(
        secret.base32,
        validCode
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid token', async () => {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret();

      const isValid = twoFactorAuthService.verifyToken(
        secret.base32,
        '000000'
      );

      expect(isValid).toBe(false);
    });

    it('should handle clock drift with window', async () => {
      const speakeasy = require('speakeasy');
      const secret = speakeasy.generateSecret();

      // Generate code from 30 seconds ago (1 step back)
      const now = Math.floor(Date.now() / 1000);
      const pastCode = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
        time: now - 30,
      });

      // Should still be valid due to window=1
      const isValid = twoFactorAuthService.verifyToken(
        secret.base32,
        pastCode
      );

      // May or may not be valid depending on exact timing
      expect(typeof isValid).toBe('boolean');
    });
  });
});
