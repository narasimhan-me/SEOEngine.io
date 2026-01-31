/**
 * AUTH-ABUSE-TESTS: Integration tests for Auth Abuse Service
 *
 * Tests:
 * - Failed login attempt tracking
 * - CAPTCHA requirement triggering
 * - Failure count and window management
 * - Cleanup functionality
 *
 * NOTE: This service uses in-memory storage, not the database.
 * Tests verify the rate-limiting and abuse prevention logic.
 */
import { AuthAbuseService } from '../../../src/captcha/auth-abuse.service';
import { ConfigService } from '@nestjs/config';

// These tests don't require E2E mode since they're in-memory
describe('AuthAbuseService (integration)', () => {
  let authAbuseService: AuthAbuseService;
  let configServiceMock: ConfigService;

  beforeEach(() => {
    // Mock ConfigService with test values
    configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'CAPTCHA_LOGIN_THRESHOLD') return 3;
        if (key === 'CAPTCHA_LOGIN_WINDOW_SECONDS') return 60; // 1 minute for testing
        return undefined;
      }),
    } as unknown as ConfigService;

    authAbuseService = new AuthAbuseService(configServiceMock);
  });

  describe('Failed Attempt Recording', () => {
    it('should record failed login attempts', () => {
      const email = 'test@example.com';

      authAbuseService.recordFailure(email);
      expect(authAbuseService.getFailureCount(email)).toBe(1);

      authAbuseService.recordFailure(email);
      expect(authAbuseService.getFailureCount(email)).toBe(2);
    });

    it('should handle case-insensitive emails', () => {
      authAbuseService.recordFailure('Test@Example.com');
      authAbuseService.recordFailure('test@example.com');
      authAbuseService.recordFailure('TEST@EXAMPLE.COM');

      expect(authAbuseService.getFailureCount('test@example.com')).toBe(3);
    });

    it('should track separate counts per email', () => {
      authAbuseService.recordFailure('user1@example.com');
      authAbuseService.recordFailure('user1@example.com');
      authAbuseService.recordFailure('user2@example.com');

      expect(authAbuseService.getFailureCount('user1@example.com')).toBe(2);
      expect(authAbuseService.getFailureCount('user2@example.com')).toBe(1);
    });
  });

  describe('CAPTCHA Requirement', () => {
    it('should not require CAPTCHA below threshold', () => {
      const email = 'test@example.com';

      authAbuseService.recordFailure(email);
      authAbuseService.recordFailure(email);
      // 2 failures, threshold is 3

      expect(authAbuseService.isCaptchaRequired(email)).toBe(false);
    });

    it('should require CAPTCHA at threshold', () => {
      const email = 'test@example.com';

      authAbuseService.recordFailure(email);
      authAbuseService.recordFailure(email);
      authAbuseService.recordFailure(email);
      // 3 failures, threshold is 3

      expect(authAbuseService.isCaptchaRequired(email)).toBe(true);
    });

    it('should require CAPTCHA above threshold', () => {
      const email = 'test@example.com';

      for (let i = 0; i < 5; i++) {
        authAbuseService.recordFailure(email);
      }

      expect(authAbuseService.isCaptchaRequired(email)).toBe(true);
    });

    it('should not require CAPTCHA for unknown email', () => {
      expect(
        authAbuseService.isCaptchaRequired('unknown@example.com')
      ).toBe(false);
    });
  });

  describe('Failure Clearing', () => {
    it('should clear failures on successful login', () => {
      const email = 'test@example.com';

      authAbuseService.recordFailure(email);
      authAbuseService.recordFailure(email);
      authAbuseService.recordFailure(email);

      expect(authAbuseService.isCaptchaRequired(email)).toBe(true);

      authAbuseService.clearFailures(email);

      expect(authAbuseService.getFailureCount(email)).toBe(0);
      expect(authAbuseService.isCaptchaRequired(email)).toBe(false);
    });

    it('should handle clearing non-existent email', () => {
      // Should not throw
      authAbuseService.clearFailures('non-existent@example.com');
      expect(
        authAbuseService.getFailureCount('non-existent@example.com')
      ).toBe(0);
    });
  });

  describe('Window Expiration', () => {
    it('should reset count after window expires', async () => {
      // Use a short window for testing
      const shortWindowConfig = {
        get: jest.fn((key: string) => {
          if (key === 'CAPTCHA_LOGIN_THRESHOLD') return 3;
          if (key === 'CAPTCHA_LOGIN_WINDOW_SECONDS') return 1; // 1 second
          return undefined;
        }),
      } as unknown as ConfigService;

      const shortWindowService = new AuthAbuseService(shortWindowConfig);
      const email = 'expiry-test@example.com';

      shortWindowService.recordFailure(email);
      shortWindowService.recordFailure(email);
      shortWindowService.recordFailure(email);

      expect(shortWindowService.isCaptchaRequired(email)).toBe(true);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(shortWindowService.isCaptchaRequired(email)).toBe(false);
      expect(shortWindowService.getFailureCount(email)).toBe(0);
    });

    it('should start new window after expiration', async () => {
      const shortWindowConfig = {
        get: jest.fn((key: string) => {
          if (key === 'CAPTCHA_LOGIN_THRESHOLD') return 2;
          if (key === 'CAPTCHA_LOGIN_WINDOW_SECONDS') return 1;
          return undefined;
        }),
      } as unknown as ConfigService;

      const service = new AuthAbuseService(shortWindowConfig);
      const email = 'window-test@example.com';

      service.recordFailure(email);
      expect(service.getFailureCount(email)).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      // New failure should start fresh window
      service.recordFailure(email);
      expect(service.getFailureCount(email)).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should remove expired entries', async () => {
      const shortWindowConfig = {
        get: jest.fn((key: string) => {
          if (key === 'CAPTCHA_LOGIN_THRESHOLD') return 3;
          if (key === 'CAPTCHA_LOGIN_WINDOW_SECONDS') return 1;
          return undefined;
        }),
      } as unknown as ConfigService;

      const service = new AuthAbuseService(shortWindowConfig);

      service.recordFailure('user1@example.com');
      service.recordFailure('user2@example.com');

      await new Promise((resolve) => setTimeout(resolve, 1100));

      service.cleanup();

      expect(service.getFailureCount('user1@example.com')).toBe(0);
      expect(service.getFailureCount('user2@example.com')).toBe(0);
    });

    it('should not remove active entries', () => {
      authAbuseService.recordFailure('active@example.com');
      authAbuseService.cleanup();

      expect(authAbuseService.getFailureCount('active@example.com')).toBe(1);
    });
  });

  describe('Default Configuration', () => {
    it('should use default values when config is missing', () => {
      const emptyConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const service = new AuthAbuseService(emptyConfig);
      const email = 'default-test@example.com';

      // Default threshold is 2
      service.recordFailure(email);
      expect(service.isCaptchaRequired(email)).toBe(false);

      service.recordFailure(email);
      expect(service.isCaptchaRequired(email)).toBe(true);
    });
  });
});
