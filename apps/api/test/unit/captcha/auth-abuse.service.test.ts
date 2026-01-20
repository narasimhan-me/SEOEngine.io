/**
 * Unit tests for AuthAbuseService
 *
 * Tests:
 * - recordFailure() records failed attempts
 * - recordFailure() resets count when window expires
 * - clearFailures() clears failed attempts
 * - isCaptchaRequired() returns false when no failures
 * - isCaptchaRequired() returns true when threshold exceeded
 * - isCaptchaRequired() returns false when window expires
 * - getFailureCount() returns correct count
 * - getFailureCount() returns 0 when window expires
 * - cleanup() removes expired entries
 */
import { AuthAbuseService } from '../../../src/captcha/auth-abuse.service';
import { ConfigService } from '@nestjs/config';

const createConfigMock = (overrides: Record<string, number | string> = {}) => {
  const defaults = {
    CAPTCHA_LOGIN_THRESHOLD: 2,
    CAPTCHA_LOGIN_WINDOW_SECONDS: 900, // 15 minutes
  };
  return {
    get: jest.fn((key: string) => overrides[key] || defaults[key] || undefined),
  } as unknown as ConfigService;
};

describe('AuthAbuseService', () => {
  let service: AuthAbuseService;
  let configMock: ConfigService;

  beforeEach(() => {
    configMock = createConfigMock();
    service = new AuthAbuseService(configMock);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('recordFailure', () => {
    it('should record first failure for an email', () => {
      service.recordFailure('test@example.com');

      expect(service.getFailureCount('test@example.com')).toBe(1);
      expect(service.isCaptchaRequired('test@example.com')).toBe(false); // Below threshold
    });

    it('should increment failure count within window', () => {
      service.recordFailure('test@example.com');
      service.recordFailure('test@example.com');

      expect(service.getFailureCount('test@example.com')).toBe(2);
      expect(service.isCaptchaRequired('test@example.com')).toBe(true); // At threshold
    });

    it('should reset count when window expires', () => {
      service.recordFailure('test@example.com');
      service.recordFailure('test@example.com');

      // Fast-forward past the window (900 seconds = 15 minutes)
      jest.advanceTimersByTime(901 * 1000);

      service.recordFailure('test@example.com');

      expect(service.getFailureCount('test@example.com')).toBe(1);
      expect(service.isCaptchaRequired('test@example.com')).toBe(false);
    });

    it('should handle case-insensitive emails', () => {
      service.recordFailure('Test@Example.com');
      service.recordFailure('test@example.com');

      expect(service.getFailureCount('TEST@EXAMPLE.COM')).toBe(2);
    });
  });

  describe('clearFailures', () => {
    it('should clear failures for an email', () => {
      service.recordFailure('test@example.com');
      service.recordFailure('test@example.com');

      expect(service.getFailureCount('test@example.com')).toBe(2);

      service.clearFailures('test@example.com');

      expect(service.getFailureCount('test@example.com')).toBe(0);
      expect(service.isCaptchaRequired('test@example.com')).toBe(false);
    });

    it('should handle case-insensitive emails', () => {
      service.recordFailure('Test@Example.com');
      service.clearFailures('test@example.com');

      expect(service.getFailureCount('TEST@EXAMPLE.COM')).toBe(0);
    });
  });

  describe('isCaptchaRequired', () => {
    it('should return false when no failures exist', () => {
      expect(service.isCaptchaRequired('test@example.com')).toBe(false);
    });

    it('should return false when below threshold', () => {
      service.recordFailure('test@example.com');

      expect(service.isCaptchaRequired('test@example.com')).toBe(false);
    });

    it('should return true when threshold is exceeded', () => {
      service.recordFailure('test@example.com');
      service.recordFailure('test@example.com');

      expect(service.isCaptchaRequired('test@example.com')).toBe(true);
    });

    it('should return false when window expires', () => {
      service.recordFailure('test@example.com');
      service.recordFailure('test@example.com');

      expect(service.isCaptchaRequired('test@example.com')).toBe(true);

      // Fast-forward past the window
      jest.advanceTimersByTime(901 * 1000);

      expect(service.isCaptchaRequired('test@example.com')).toBe(false);
      expect(service.getFailureCount('test@example.com')).toBe(0);
    });

    it('should handle custom threshold from config', () => {
      const config = createConfigMock({ CAPTCHA_LOGIN_THRESHOLD: 3 });
      const serviceWithCustomThreshold = new AuthAbuseService(config);

      serviceWithCustomThreshold.recordFailure('test@example.com');
      serviceWithCustomThreshold.recordFailure('test@example.com');

      expect(
        serviceWithCustomThreshold.isCaptchaRequired('test@example.com')
      ).toBe(false);

      serviceWithCustomThreshold.recordFailure('test@example.com');

      expect(
        serviceWithCustomThreshold.isCaptchaRequired('test@example.com')
      ).toBe(true);
    });
  });

  describe('getFailureCount', () => {
    it('should return 0 when no failures exist', () => {
      expect(service.getFailureCount('test@example.com')).toBe(0);
    });

    it('should return correct count within window', () => {
      service.recordFailure('test@example.com');
      expect(service.getFailureCount('test@example.com')).toBe(1);

      service.recordFailure('test@example.com');
      expect(service.getFailureCount('test@example.com')).toBe(2);
    });

    it('should return 0 when window expires', () => {
      service.recordFailure('test@example.com');
      service.recordFailure('test@example.com');

      expect(service.getFailureCount('test@example.com')).toBe(2);

      // Fast-forward past the window
      jest.advanceTimersByTime(901 * 1000);

      expect(service.getFailureCount('test@example.com')).toBe(0);
    });

    it('should handle case-insensitive emails', () => {
      service.recordFailure('Test@Example.com');
      service.recordFailure('test@example.com');

      expect(service.getFailureCount('TEST@EXAMPLE.COM')).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      service.recordFailure('expired@example.com');
      service.recordFailure('active@example.com');

      // Fast-forward past the window for expired entry
      jest.advanceTimersByTime(901 * 1000);

      service.recordFailure('active@example.com'); // Keep this one active

      service.cleanup();

      expect(service.getFailureCount('expired@example.com')).toBe(0);
      expect(service.getFailureCount('active@example.com')).toBe(1);
    });

    it('should not remove active entries', () => {
      service.recordFailure('test@example.com');
      service.recordFailure('test@example.com');

      // Fast-forward but not past the window
      jest.advanceTimersByTime(100 * 1000);

      service.cleanup();

      expect(service.getFailureCount('test@example.com')).toBe(2);
    });
  });

  describe('integration scenarios', () => {
    it('should track multiple emails independently', () => {
      service.recordFailure('user1@example.com');
      service.recordFailure('user1@example.com');
      service.recordFailure('user2@example.com');

      expect(service.isCaptchaRequired('user1@example.com')).toBe(true);
      expect(service.isCaptchaRequired('user2@example.com')).toBe(false);
    });

    it('should clear failures on successful login', () => {
      service.recordFailure('test@example.com');
      service.recordFailure('test@example.com');

      expect(service.isCaptchaRequired('test@example.com')).toBe(true);

      service.clearFailures('test@example.com');

      expect(service.isCaptchaRequired('test@example.com')).toBe(false);
      expect(service.getFailureCount('test@example.com')).toBe(0);
    });

    it('should handle custom window from config', () => {
      const config = createConfigMock({ CAPTCHA_LOGIN_WINDOW_SECONDS: 60 }); // 1 minute
      const serviceWithCustomWindow = new AuthAbuseService(config);

      serviceWithCustomWindow.recordFailure('test@example.com');
      serviceWithCustomWindow.recordFailure('test@example.com');

      expect(
        serviceWithCustomWindow.isCaptchaRequired('test@example.com')
      ).toBe(true);

      // Fast-forward past the custom window (60 seconds)
      jest.advanceTimersByTime(61 * 1000);

      expect(
        serviceWithCustomWindow.isCaptchaRequired('test@example.com')
      ).toBe(false);
    });
  });
});
