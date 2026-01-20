import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from './auth.service';
import { PrismaService } from '../prisma.service';

// [SELF-SERVICE-1] Throttle interval for updating session lastSeenAt (5 minutes)
const SESSION_UPDATE_THROTTLE_MS = 5 * 60 * 1000;
// In-memory cache for last update times (per session)
const sessionUpdateCache = new Map<string, number>();

/**
 * [ADMIN-OPS-1] Impersonation payload structure.
 * Passed through req.user when an admin is impersonating a user.
 * NOT persisted to DB - only exists in the JWT session.
 */
export interface ImpersonationPayload {
  actorUserId: string; // The internal admin initiating impersonation
  actorAdminRole: string; // Admin role at time of impersonation
  mode: 'readOnly'; // Always read-only for ADMIN-OPS-1
  issuedAt: number; // Timestamp when impersonation was initiated
  reason?: string; // Optional reason for impersonation
}

/**
 * [ADMIN-OPS-1] Extended JWT payload that may include impersonation data.
 */
export interface ExtendedJwtPayload extends JwtPayload {
  impersonation?: ImpersonationPayload;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'default-secret-change-in-production',
    });
  }

  async validate(payload: ExtendedJwtPayload) {
    // Reject temp 2FA tokens - they should only be used for /auth/2fa/verify
    // This ensures temp tokens cannot grant normal API access
    if (payload.twoFactor === true) {
      throw new UnauthorizedException(
        'Invalid token - 2FA verification required'
      );
    }

    const user = await this.authService.validateJwtPayload(payload);
    if (!user) {
      throw new UnauthorizedException();
    }

    // [SELF-SERVICE-1] Enforce tokenInvalidBefore for non-impersonation tokens
    // Impersonation tokens are NOT affected by sign-out-all (they are admin-initiated)
    if (!payload.impersonation && user.tokenInvalidBefore) {
      const tokenIssuedAt = payload.iat ? payload.iat * 1000 : 0; // JWT iat is in seconds
      if (tokenIssuedAt < user.tokenInvalidBefore.getTime()) {
        throw new UnauthorizedException(
          'Token has been invalidated. Please log in again.'
        );
      }
    }

    // [SELF-SERVICE-1] Enforce session validity when token includes a session ID
    // Impersonation tokens do not have session IDs
    if (!payload.impersonation && payload.sessionId) {
      const isValid = await this.authService.isSessionValid(payload.sessionId);
      if (!isValid) {
        throw new UnauthorizedException(
          'Session has been revoked. Please log in again.'
        );
      }

      // Update session lastSeenAt on a safe cadence (throttled to avoid DB pressure)
      this.maybeUpdateSessionLastSeen(payload.sessionId);
    }

    // [ADMIN-OPS-1] Pass through impersonation payload if present (do NOT persist to DB)
    if (payload.impersonation) {
      return {
        ...user,
        impersonation: payload.impersonation,
      };
    }

    return user;
  }

  /**
   * [SELF-SERVICE-1] Update session lastSeenAt if sufficient time has passed.
   * This is fire-and-forget to avoid blocking the request.
   */
  private maybeUpdateSessionLastSeen(sessionId: string): void {
    const now = Date.now();
    const lastUpdate = sessionUpdateCache.get(sessionId) || 0;

    if (now - lastUpdate > SESSION_UPDATE_THROTTLE_MS) {
      sessionUpdateCache.set(sessionId, now);
      // Fire and forget - don't await
      this.authService.updateSessionLastSeen(sessionId).catch(() => {
        // Silently ignore errors - this is non-critical
      });
    }
  }
}
