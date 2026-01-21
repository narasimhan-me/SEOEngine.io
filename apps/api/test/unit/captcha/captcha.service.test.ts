/**
 * Unit tests for CaptchaService
 *
 * Tests:
 * - verify() throws when token is missing
 * - verify() successfully verifies Turnstile token
 * - verify() throws when verification fails
 * - verify() handles network errors
 * - verify() throws for unsupported providers
 */
import { CaptchaService } from '../../../src/captcha/captcha.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

const createConfigMock = (overrides: Record<string, string> = {}) => {
  const defaults = {
    CAPTCHA_SECRET_KEY: 'test-secret-key',
    CAPTCHA_PROVIDER: 'turnstile',
  };
  return {
    get: jest.fn((key: string) => overrides[key] || defaults[key] || ''),
  } as unknown as ConfigService;
};

describe('CaptchaService', () => {
  let service: CaptchaService;
  let configMock: ConfigService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    configMock = createConfigMock();
    service = new CaptchaService(configMock);
    originalFetch = global.fetch;
    (global.fetch as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('verify', () => {
    it('should throw BadRequestException when token is missing', async () => {
      await expect(service.verify('')).rejects.toThrow(BadRequestException);
      await expect(service.verify('')).rejects.toThrow(
        'CAPTCHA token is required'
      );
    });

    it('should successfully verify Turnstile token', async () => {
      const mockResponse = {
        success: true,
        'error-codes': [],
        challenge_ts: '2023-01-01T00:00:00.000Z',
        hostname: 'example.com',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.verify('valid-token', '192.168.1.1');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
    });

    it('should throw BadRequestException when verification fails', async () => {
      const mockResponse = {
        success: false,
        'error-codes': ['invalid-input-response', 'timeout-or-duplicate'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      jest.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(service.verify('invalid-token')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.verify('invalid-token')).rejects.toThrow(
        'CAPTCHA verification failed. Please try again.'
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Turnstile verification failed')
      );

      (console.warn as jest.Mock).mockRestore();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(service.verify('token')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.verify('token')).rejects.toThrow(
        'CAPTCHA verification failed. Please try again.'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Turnstile verification error:',
        networkError
      );

      (console.error as jest.Mock).mockRestore();
    });

    it('should include remote IP in request when provided', async () => {
      const mockResponse = {
        success: true,
        'error-codes': [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await service.verify('token', '192.168.1.1');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = fetchCall[1].body;
      expect(body).toContain('remoteip=192.168.1.1');
    });

    it('should use dev secret key when CAPTCHA_SECRET_KEY is not configured', async () => {
      const config = {
        get: jest.fn((key: string) => {
          if (key === 'CAPTCHA_SECRET_KEY') {
            return undefined; // Not configured
          }
          if (key === 'CAPTCHA_PROVIDER') {
            return 'turnstile';
          }
          return '';
        }),
      } as unknown as ConfigService;
      const serviceWithDevKey = new CaptchaService(config);

      const mockResponse = {
        success: true,
        'error-codes': [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await serviceWithDevKey.verify('token');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = fetchCall[1].body;
      expect(body).toContain('secret=1x0000000000000000000000000000000AA');
    });

    it('should throw BadRequestException for unsupported providers', async () => {
      const config = createConfigMock({ CAPTCHA_PROVIDER: 'recaptcha' });
      const serviceWithUnsupportedProvider = new CaptchaService(config);

      await expect(
        serviceWithUnsupportedProvider.verify('token')
      ).rejects.toThrow(BadRequestException);
      await expect(
        serviceWithUnsupportedProvider.verify('token')
      ).rejects.toThrow('Unsupported CAPTCHA provider: recaptcha');
    });
  });
});
