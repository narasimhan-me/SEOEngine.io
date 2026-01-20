import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FailedAttempt {
  count: number;
  firstAttempt: number;
}

@Injectable()
export class AuthAbuseService {
  // In-memory store for failed login attempts by email
  // In production, consider using Redis for distributed systems
  private failedAttempts: Map<string, FailedAttempt> = new Map();

  private readonly threshold: number;
  private readonly windowSeconds: number;

  constructor(private configService: ConfigService) {
    // Number of failed attempts before CAPTCHA is required
    this.threshold =
      this.configService.get<number>('CAPTCHA_LOGIN_THRESHOLD') || 2;
    // Time window in seconds to track failed attempts (default 15 minutes)
    this.windowSeconds =
      this.configService.get<number>('CAPTCHA_LOGIN_WINDOW_SECONDS') || 900;
  }

  /**
   * Record a failed login attempt for an email
   * @param email The email that failed to login
   */
  recordFailure(email: string): void {
    const key = email.toLowerCase();
    const now = Date.now();
    const existing = this.failedAttempts.get(key);

    if (existing) {
      // Check if we're still within the window
      const elapsed = (now - existing.firstAttempt) / 1000;
      if (elapsed < this.windowSeconds) {
        existing.count++;
      } else {
        // Window expired, start fresh
        this.failedAttempts.set(key, { count: 1, firstAttempt: now });
      }
    } else {
      this.failedAttempts.set(key, { count: 1, firstAttempt: now });
    }
  }

  /**
   * Clear failed attempts for an email (called on successful login)
   * @param email The email that successfully logged in
   */
  clearFailures(email: string): void {
    this.failedAttempts.delete(email.toLowerCase());
  }

  /**
   * Check if CAPTCHA is required for an email based on failed attempts
   * @param email The email attempting to login
   * @returns true if CAPTCHA should be required
   */
  isCaptchaRequired(email: string): boolean {
    const key = email.toLowerCase();
    const existing = this.failedAttempts.get(key);

    if (!existing) {
      return false;
    }

    // Check if window has expired
    const elapsed = (Date.now() - existing.firstAttempt) / 1000;
    if (elapsed >= this.windowSeconds) {
      // Window expired, clear and don't require CAPTCHA
      this.failedAttempts.delete(key);
      return false;
    }

    // Require CAPTCHA if attempts exceed threshold
    return existing.count >= this.threshold;
  }

  /**
   * Get the current failure count for an email
   * @param email The email to check
   * @returns The number of failed attempts in the current window
   */
  getFailureCount(email: string): number {
    const key = email.toLowerCase();
    const existing = this.failedAttempts.get(key);

    if (!existing) {
      return 0;
    }

    // Check if window has expired
    const elapsed = (Date.now() - existing.firstAttempt) / 1000;
    if (elapsed >= this.windowSeconds) {
      this.failedAttempts.delete(key);
      return 0;
    }

    return existing.count;
  }

  /**
   * Periodic cleanup of expired entries (call from a cron job or interval)
   */
  cleanup(): void {
    const now = Date.now();
    const windowMs = this.windowSeconds * 1000;

    for (const [key, value] of this.failedAttempts.entries()) {
      if (now - value.firstAttempt >= windowMs) {
        this.failedAttempts.delete(key);
      }
    }
  }
}
