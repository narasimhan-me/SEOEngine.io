/**
 * Unit tests for AdminService
 *
 * Tests:
 * - getUsers() returns paginated users
 * - getUser() returns user with details
 * - getUser() throws when user not found
 * - updateUserRole() updates user role
 * - updateUserSubscription() updates subscription
 * - getStats() returns dashboard statistics
 */
import { AdminService } from '../../../src/admin/admin.service';
import { PrismaService } from '../../../src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ShopifyService } from '../../../src/shopify/shopify.service';
import { NotFoundException } from '@nestjs/common';

const createPrismaMock = () => ({
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
  project: {
    count: jest.fn(),
  },
  subscription: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    groupBy: jest.fn(),
  },
  automationPlaybookRun: {
    count: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  aiUsageEvents: {
    some: jest.fn(),
  },
  adminAuditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  aiMonthlyQuotaReset: {
    create: jest.fn(),
  },
  answerBlockAutomationLog: {
    count: jest.fn(),
  },
  governanceAuditEvent: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
});

const createJwtServiceMock = () => ({
  sign: jest.fn(),
});

const createShopifyServiceMock = () => ({
  syncProducts: jest.fn(),
});

describe('AdminService', () => {
  let service: AdminService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let jwtServiceMock: ReturnType<typeof createJwtServiceMock>;
  let shopifyServiceMock: ReturnType<typeof createShopifyServiceMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    jwtServiceMock = createJwtServiceMock();
    shopifyServiceMock = createShopifyServiceMock();
    service = new AdminService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
      shopifyServiceMock as any,
    );
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          role: 'USER',
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          subscription: { plan: 'free', status: 'active' },
          _count: { projects: 2 },
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User 2',
          role: 'ADMIN',
          twoFactorEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          subscription: { plan: 'pro', status: 'active' },
          _count: { projects: 5 },
        },
      ];

      prismaMock.user.findMany.mockResolvedValue(mockUsers);
      prismaMock.user.count.mockResolvedValue(2);
      // Mock automationPlaybookRun.count for each user's AI usage calculation
      prismaMock.automationPlaybookRun.count.mockResolvedValue(0);
      prismaMock.automationPlaybookRun.findFirst.mockResolvedValue(null);

      const result = await service.getUsers(1, 20);

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('pagination');
      expect(result.users).toHaveLength(2);
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 20);
      expect(result.pagination).toHaveProperty('total', 2);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
      });
    });

    it('should handle pagination correctly', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(50);

      const result = await service.getUsers(2, 10);

      expect(result.pagination).toHaveProperty('page', 2);
      expect(result.pagination).toHaveProperty('pages', 5);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
      });
    });
  });

  describe('getUser', () => {
    it('should return user with details', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User 1',
        role: 'USER',
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        subscription: { plan: 'free', status: 'active' },
        projects: [
          { id: 'proj-1', name: 'Project 1', domain: 'example.com', createdAt: new Date(), _count: { products: 5 } },
        ],
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.automationPlaybookRun.count.mockResolvedValue(0);
      prismaMock.automationPlaybookRun.findMany.mockResolvedValue([]);

      const result = await service.getUser('user-1');

      expect(result).toHaveProperty('id', 'user-1');
      expect(result).toHaveProperty('email', 'user1@example.com');
      expect(result).toHaveProperty('usageSummary');
      expect(result.usageSummary).toHaveProperty('aiUsageThisMonth', 0);
      expect(result.usageSummary).toHaveProperty('recentRuns', []);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getUser('user-1')).rejects.toThrow(NotFoundException);
      await expect(service.getUser('user-1')).rejects.toThrow('User not found');
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User 1',
        role: 'USER',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        role: 'ADMIN',
      });

      const result = await service.updateUserRole('user-1', 'ADMIN');

      expect(result.role).toBe('ADMIN');
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'ADMIN' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUserRole('user-1', 'ADMIN')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUserSubscription', () => {
    it('should update existing subscription', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user1@example.com',
      };

      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'free',
        status: 'active',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      prismaMock.subscription.update.mockResolvedValue({
        ...mockSubscription,
        plan: 'pro',
      });

      const result = await service.updateUserSubscription('user-1', 'pro');

      expect(result.plan).toBe('pro');
      expect(prismaMock.subscription.update).toHaveBeenCalled();
    });

    it('should create subscription when none exists', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user1@example.com',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.subscription.findUnique.mockResolvedValue(null);
      prismaMock.subscription.create.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
      });

      const result = await service.updateUserSubscription('user-1', 'pro');

      expect(result.plan).toBe('pro');
      expect(prismaMock.subscription.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUserSubscription('user-1', 'pro')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return dashboard statistics', async () => {
      prismaMock.user.count.mockResolvedValue(100);
      prismaMock.project.count.mockResolvedValue(250);
      prismaMock.user.count.mockResolvedValueOnce(100).mockResolvedValueOnce(5); // total, today
      prismaMock.user.groupBy.mockResolvedValue([
        { role: 'USER', _count: 95 },
        { role: 'ADMIN', _count: 5 },
      ]);
      prismaMock.subscription.groupBy.mockResolvedValue([
        { plan: 'free', _count: 80 },
        { plan: 'pro', _count: 15 },
        { plan: 'business', _count: 5 },
      ]);

      const result = await service.getStats();

      expect(result).toHaveProperty('totalUsers', 100);
      expect(result).toHaveProperty('totalProjects', 250);
      expect(result).toHaveProperty('usersToday', 5);
      expect(result).toHaveProperty('usersByRole');
      expect(result).toHaveProperty('subscriptionsByPlan');
      expect(result.usersByRole).toHaveProperty('USER', 95);
      expect(result.usersByRole).toHaveProperty('ADMIN', 5);
      expect(result.subscriptionsByPlan).toHaveProperty('free', 80);
      expect(result.subscriptionsByPlan).toHaveProperty('pro', 15);
    });
  });
});

