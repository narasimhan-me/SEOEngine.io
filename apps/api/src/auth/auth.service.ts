import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  twoFactor?: boolean; // true for temp tokens during 2FA flow
  sessionId?: string; // [SELF-SERVICE-1] Session ID for session tracking
  iat?: number; // JWT issued at timestamp
}

// Response when user has 2FA enabled
export interface TwoFactorLoginResponse {
  requires2FA: true;
  tempToken: string;
  user: {
    id: string;
    email: string;
  };
}

// Response for normal login (no 2FA or 2FA verified)
export interface NormalLoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    twoFactorEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

export type LoginResponse = TwoFactorLoginResponse | NormalLoginResponse;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async signup(email: string, password: string, name?: string) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.validateUser(email, password);

    // TODO: Add rate limiting to prevent brute-force attacks

    // Check if user has 2FA enabled
    if (user.twoFactorEnabled) {
      // Generate a short-lived temp token for 2FA verification
      const tempPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        twoFactor: true, // Mark this as a temp 2FA token
      };

      // Temp token expires in 10 minutes
      const tempToken = this.jwtService.sign(tempPayload, { expiresIn: '10m' });

      return {
        requires2FA: true,
        tempToken,
        user: {
          id: user.id,
          email: user.email,
        },
      };
    }

    // Normal login (no 2FA) - create session and issue token
    const { accessToken, session } = await this.createSessionAndToken(
      user.id,
      user.email,
      user.role
    );

    // [SELF-SERVICE-1] Update last login info (ip can be passed from controller if needed)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      user,
    };
  }

  /**
   * [SELF-SERVICE-1] Create a session record and issue a JWT with the session ID.
   * This enables session tracking and sign-out-all functionality.
   */
  private async createSessionAndToken(
    userId: string,
    email: string,
    role: string,
    ip?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; session: { id: string } }> {
    // Create a session record
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        ip,
        userAgent,
        lastSeenAt: new Date(),
      },
    });

    // Issue JWT with session ID
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      sessionId: session.id,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      session: { id: session.id },
    };
  }

  /**
   * Verify 2FA code and return final access token.
   * Called after user provides TOTP code during 2FA login flow.
   *
   * TODO: Add rate limiting to prevent brute-force attacks on TOTP codes
   */
  async verifyTwoFactor(
    tempToken: string,
    code: string
  ): Promise<NormalLoginResponse> {
    // Verify the temp token
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Ensure this is a temp 2FA token, not a full access token
    if (!payload.twoFactor) {
      throw new BadRequestException('Invalid verification token');
    }

    // Load user from database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA is not configured for this user');
    }

    // Verify the TOTP code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1, // Allow 1 step before/after for clock drift
    });

    if (!isValid) {
      // Generic error message to avoid leaking info
      throw new BadRequestException('Invalid or expired code');
    }

    // [SELF-SERVICE-1] Create session and issue final access token with session ID
    const { accessToken } = await this.createSessionAndToken(
      user.id,
      user.email,
      user.role
    );

    // [SELF-SERVICE-1] Update last login info
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { password: _, twoFactorSecret: __, ...userWithoutSensitive } = user;

    return {
      accessToken,
      user: userWithoutSensitive,
    };
  }

  async validateJwtPayload(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Exclude sensitive fields: password and twoFactorSecret
    // twoFactorEnabled is included so frontend can show 2FA status
    const { password: _, twoFactorSecret: __, ...userWithoutSensitive } = user;
    return userWithoutSensitive;
  }

  /**
   * [SELF-SERVICE-1] Sign out all sessions for a user.
   * Sets tokenInvalidBefore to now, revokes all sessions, and writes audit log.
   */
  async signOutAllSessions(userId: string): Promise<{ revokedCount: number }> {
    const now = new Date();

    // Update tokenInvalidBefore to invalidate all existing tokens
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenInvalidBefore: now },
    });

    // Revoke all existing sessions
    const result = await this.prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });

    // Write audit log entry
    await this.prisma.userAccountAuditLog.create({
      data: {
        actorUserId: userId,
        actionType: 'sign_out_all_sessions',
        metadata: {
          revokedCount: result.count,
          timestamp: now.toISOString(),
        },
      },
    });

    return { revokedCount: result.count };
  }

  /**
   * [SELF-SERVICE-1] Update session last seen time.
   * Called periodically during authenticated requests (throttled).
   */
  async updateSessionLastSeen(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
  }

  /**
   * [SELF-SERVICE-1] Check if a session is valid (not revoked).
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });
    return session !== null && session.revokedAt === null;
  }
}
