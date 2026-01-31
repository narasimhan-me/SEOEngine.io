/**
 * CAPTCHA-TESTS: Integration tests for Captcha Service
 *
 * Tests:
 * - Turnstile token verification
 * - Error handling
 * - Provider configuration
 *
 * NOTE: These tests mock the external Turnstile API since we can't
 * make real API calls in tests. The tests verify the service logic.
 */
import { CaptchaService } from '../../../src/captcha/captcha.service';
import { ConfigService } from '@nestjs/config';

// These tests don't require E2E mode since they mock external APIs
describe('CaptchaService (integration)', () => {
  let captchaService: CaptchaService;
  let configServiceMock: ConfigService;
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'CAPTCHA_SECRET_KEY') return 'test-secret-key';
        if (key === 'CAPTCHA_PROVIDER') return 'turnstile';
        return undefined;
      }),
    } as unknown as ConfigService;

    captchaService = new CaptchaService(configServiceMock);
  });

  describe('Token Verification', () => {
    it('should verify valid Turnstile token', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          challenge_ts: new Date().toISOString(),
          hostname: 'example.com',
        }),
      });

      const result = await captchaService.verify('valid-token');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
    });

    it('should include IP address when provided', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      });

      await captchaService.verify('token', '192.168.1.1');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[1].body).toContain('remoteip=192.168.1.1');
    });

    it('should throw BadRequestException for missing token', async () => {
      await expect(captchaService.verify('')).rejects.toThrow(
        'CAPTCHA token is required'
      );
    });

    it('should throw BadRequestException for failed verification', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          success: false,
          'error-codes': ['invalid-input-response'],
        }),
      });

      await expect(captchaService.verify('invalid-token')).rejects.toThrow(
        'CAPTCHA verification failed'
      );
    });

    it('should handle network errors gracefully', async () => {
      (global as any).fetch = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      await expect(captchaService.verify('token')).rejects.toThrow(
        'CAPTCHA verification failed'
      );
    });

    it('should handle multiple error codes', async () => {
      const consoleSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      (global as any).fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          success: false,
          'error-codes': ['missing-input-secret', 'invalid-input-response'],
        }),
      });

      await expect(captchaService.verify('token')).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing-input-secret')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Provider Configuration', () => {
    it('should use default dev secret key when not configured', () => {
      const emptyConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const service = new CaptchaService(emptyConfig);

      // Service should be instantiated without error
      expect(service).toBeDefined();
    });

    it('should throw for unsupported provider', async () => {
      const unsupportedConfig = {
        get: jest.fn((key: string) => {
          if (key === 'CAPTCHA_PROVIDER') return 'unsupported';
          return undefined;
        }),
      } as unknown as ConfigService;

      const service = new CaptchaService(unsupportedConfig);

      await expect(service.verify('token')).rejects.toThrow(
        'Unsupported CAPTCHA provider: unsupported'
      );
    });

    it('should default to turnstile provider', () => {
      const noProviderConfig = {
        get: jest.fn((key: string) => {
          if (key === 'CAPTCHA_SECRET_KEY') return 'key';
          return undefined;
        }),
      } as unknown as ConfigService;

      const service = new CaptchaService(noProviderConfig);

      // Should not throw - defaults to turnstile
      expect(service).toBeDefined();
    });
  });

  describe('Request Format', () => {
    it('should send correct request body format', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      });

      await captchaService.verify('test-token-123');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = callArgs[1].body;

      expect(body).toContain('secret=test-secret-key');
      expect(body).toContain('response=test-token-123');
    });

    it('should use form URL encoding', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      });

      await captchaService.verify('token');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      expect(callArgs[1].headers['Content-Type']).toBe(
        'application/x-www-form-urlencoded'
      );
    });
  });
});
