import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';

export interface JwtPayload {
  sub: string;
  email: string;
  twoFactor?: boolean; // true for temp tokens during 2FA flow
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
    private readonly jwtService: JwtService,
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

    // Normal login (no 2FA)
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  /**
   * Verify 2FA code and return final access token.
   * Called after user provides TOTP code during 2FA login flow.
   *
   * TODO: Add rate limiting to prevent brute-force attacks on TOTP codes
   */
  async verifyTwoFactor(tempToken: string, code: string): Promise<NormalLoginResponse> {
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

    // Generate final access token (without twoFactor claim)
    const finalPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const { password: _, twoFactorSecret: __, ...userWithoutSensitive } = user;

    return {
      accessToken: this.jwtService.sign(finalPayload),
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
}
