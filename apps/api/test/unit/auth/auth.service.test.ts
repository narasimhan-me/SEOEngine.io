/**
 * Unit tests for AuthService
 *
 * Tests:
 * - signup() creates new users
 * - signup() rejects duplicate emails
 * - validateUser() validates credentials
 * - login() returns access token for normal users
 * - login() returns temp token for 2FA users
 * - verifyTwoFactor() validates TOTP codes
 * - validateJwtPayload() validates JWT tokens
 */
import { AuthService, JwtPayload } from '../../../src/auth/auth.service';
import { PrismaService } from '../../../src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';

jest.mock('bcrypt');
jest.mock('speakeasy');

const createPrismaMock = () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
});

const createJwtServiceMock = () => ({
  sign: jest.fn(),
  verify: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let jwtServiceMock: ReturnType<typeof createJwtServiceMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    jwtServiceMock = createJwtServiceMock();
    service = new AuthService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
    );
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new user successfully', async () => {
      const hashedPassword = 'hashed-password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorEnabled: false,
        twoFactorSecret: null,
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await service.signup('test@example.com', 'password123', 'Test User');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          name: 'Test User',
        },
      });
    });

    it('should throw ConflictException when user already exists', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      prismaMock.user.findUnique.mockResolvedValue(existingUser);

      await expect(service.signup('test@example.com', 'password123')).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should create user without name when name is not provided', async () => {
      const hashedPassword = 'hashed-password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: hashedPassword,
        name: null,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorEnabled: false,
        twoFactorSecret: null,
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await service.signup('test@example.com', 'password123');

      expect(result.name).toBeNull();
    });
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorEnabled: false,
        twoFactorSecret: null,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('test@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('test@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('should return access token for user without 2FA', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorEnabled: false,
        twoFactorSecret: null,
      };

      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtServiceMock.sign.mockReturnValue('access-token');

      const result = await service.login('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('user', mockUser);
      expect('requires2FA' in result).toBe(false);
      expect(jwtServiceMock.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
      });
    });

    it('should return temp token for user with 2FA enabled', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
      };

      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtServiceMock.sign.mockReturnValue('temp-token');

      const result = await service.login('test@example.com', 'password123');

      expect(result).toHaveProperty('requires2FA', true);
      expect(result).toHaveProperty('tempToken', 'temp-token');
      expect(result).toHaveProperty('user', {
        id: 'user-1',
        email: 'test@example.com',
      });
      expect(jwtServiceMock.sign).toHaveBeenCalledWith(
        {
          sub: 'user-1',
          email: 'test@example.com',
          role: 'user',
          twoFactor: true,
        },
        { expiresIn: '10m' },
      );
    });
  });

  describe('verifyTwoFactor', () => {
    it('should return access token when TOTP code is valid', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
        twoFactor: true,
      };

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorEnabled: true,
        twoFactorSecret: 'base32-secret',
        password: 'hashed-password',
      };

      jwtServiceMock.verify.mockReturnValue(payload);
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      jwtServiceMock.sign.mockReturnValue('final-access-token');

      const result = await service.verifyTwoFactor('temp-token', '123456');

      expect(result).toHaveProperty('accessToken', 'final-access-token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('twoFactorSecret');
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'base32-secret',
        encoding: 'base32',
        token: '123456',
        window: 1,
      });
    });

    it('should throw BadRequestException when temp token is invalid', async () => {
      jwtServiceMock.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyTwoFactor('invalid-token', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when temp token is not a 2FA token', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
        // twoFactor is missing
      };

      jwtServiceMock.verify.mockReturnValue(payload);

      await expect(service.verifyTwoFactor('temp-token', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when TOTP code is invalid', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
        twoFactor: true,
      };

      const mockUser = {
        id: 'user-1',
        twoFactorSecret: 'base32-secret',
      };

      jwtServiceMock.verify.mockReturnValue(payload);
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verifyTwoFactor('temp-token', 'wrong-code')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateJwtPayload', () => {
    it('should return user when payload is valid', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
      };

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorEnabled: false,
        twoFactorSecret: 'secret',
        password: 'hashed-password',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateJwtPayload(payload);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('twoFactorSecret');
      expect(result).toHaveProperty('twoFactorEnabled', false);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: 'user',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.validateJwtPayload(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});

