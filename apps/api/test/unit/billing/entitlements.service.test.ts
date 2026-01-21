/**
 * Unit tests for EntitlementsService
 *
 * Tests:
 * - getUserPlan() returns plan from subscription
 * - getUserPlan() returns free when no subscription
 * - getEntitlementsSummary() returns summary with usage
 * - getAiSuggestionLimit() returns limit for plan
 * - getDailyAiUsage() returns daily usage count
 * - ensureWithinDailyAiLimit() throws when limit reached
 * - recordAiUsage() records usage event
 * - enforceEntitlement() throws when limit reached
 * - ensureCanCreateProject() throws when project limit reached
 * - canAutoApplyMetadataAutomations() returns correct value
 */
import { EntitlementsService } from '../../../src/billing/entitlements.service';
import { PrismaService } from '../../../src/prisma.service';
import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';

const createPrismaMock = () => ({
  subscription: {
    findUnique: jest.fn(),
  },
  project: {
    count: jest.fn(),
  },
  aiUsageEvent: {
    count: jest.fn(),
    create: jest.fn(),
  },
});

describe('EntitlementsService', () => {
  let service: EntitlementsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new EntitlementsService(prismaMock as unknown as PrismaService);
  });

  describe('getUserPlan', () => {
    it('should return plan from active subscription', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.getUserPlan('user-1');

      expect(result).toBe('pro');
      expect(prismaMock.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return free when no subscription exists', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getUserPlan('user-1');

      expect(result).toBe('free');
    });

    it('should return free when subscription is not active', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'canceled',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.getUserPlan('user-1');

      expect(result).toBe('free');
    });
  });

  describe('getEntitlementsSummary', () => {
    it('should return summary with plan, limits, and usage', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      prismaMock.project.count.mockResolvedValue(3);

      const result = await service.getEntitlementsSummary('user-1');

      expect(result).toHaveProperty('plan', 'pro');
      expect(result).toHaveProperty('limits');
      expect(result).toHaveProperty('usage');
      expect(result.usage).toHaveProperty('projects', 3);
      expect(prismaMock.project.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return free plan summary when no subscription', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);
      prismaMock.project.count.mockResolvedValue(1);

      const result = await service.getEntitlementsSummary('user-1');

      expect(result).toHaveProperty('plan', 'free');
      expect(result.usage).toHaveProperty('projects', 1);
    });
  });

  describe('getAiSuggestionLimit', () => {
    it('should return limit for user plan', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.getAiSuggestionLimit('user-1');

      expect(result).toHaveProperty('planId', 'pro');
      expect(result).toHaveProperty('limit');
      expect(typeof result.limit).toBe('number');
    });
  });

  describe('getDailyAiUsage', () => {
    it('should return daily usage count', async () => {
      const now = new Date();
      prismaMock.aiUsageEvent.count.mockResolvedValue(5);

      const result = await service.getDailyAiUsage(
        'user-1',
        'proj-1',
        'test-feature'
      );

      expect(result).toBe(5);
      expect(prismaMock.aiUsageEvent.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          projectId: 'proj-1',
          feature: 'test-feature',
          createdAt: {
            gte: expect.any(Date),
          },
        },
      });
    });
  });

  describe('ensureWithinDailyAiLimit', () => {
    it('should return when within limit', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      prismaMock.aiUsageEvent.count.mockResolvedValue(2);

      const result = await service.ensureWithinDailyAiLimit(
        'user-1',
        'proj-1',
        'test-feature'
      );

      expect(result).toHaveProperty('planId');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('dailyCount', 2);
    });

    it('should return when limit is unlimited (-1)', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'business',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      prismaMock.aiUsageEvent.count.mockResolvedValue(100);

      const result = await service.ensureWithinDailyAiLimit(
        'user-1',
        'proj-1',
        'test-feature'
      );

      expect(result).toHaveProperty('limit', -1);
      expect(result).toHaveProperty('dailyCount', 100);
    });

    it('should throw HttpException when limit reached', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'free',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      prismaMock.aiUsageEvent.count.mockResolvedValue(5); // Free plan limit is 5

      jest.spyOn(console, 'log').mockImplementation(() => {});

      await expect(
        service.ensureWithinDailyAiLimit('user-1', 'proj-1', 'test-feature')
      ).rejects.toThrow(HttpException);

      const error = await service
        .ensureWithinDailyAiLimit('user-1', 'proj-1', 'test-feature')
        .catch((e) => e);

      expect(error.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.response).toHaveProperty('code', 'AI_DAILY_LIMIT_REACHED');

      (console.log as jest.Mock).mockRestore();
    });
  });

  describe('recordAiUsage', () => {
    it('should record AI usage event', async () => {
      prismaMock.aiUsageEvent.create.mockResolvedValue({
        id: 'event-1',
        userId: 'user-1',
        projectId: 'proj-1',
        feature: 'test-feature',
        createdAt: new Date(),
      });

      await service.recordAiUsage('user-1', 'proj-1', 'test-feature');

      expect(prismaMock.aiUsageEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          projectId: 'proj-1',
          feature: 'test-feature',
        },
      });
    });
  });

  describe('enforceEntitlement', () => {
    it('should not throw when within limit', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);

      await expect(
        service.enforceEntitlement('user-1', 'projects', 5, 10)
      ).resolves.not.toThrow();
    });

    it('should not throw when limit is unlimited (-1)', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'business',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);

      await expect(
        service.enforceEntitlement('user-1', 'projects', 100, -1)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when limit reached', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'free',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);

      await expect(
        service.enforceEntitlement('user-1', 'projects', 1, 1)
      ).rejects.toThrow(ForbiddenException);

      const error = await service
        .enforceEntitlement('user-1', 'projects', 1, 1)
        .catch((e) => e);

      expect(error.response).toHaveProperty(
        'code',
        'ENTITLEMENTS_LIMIT_REACHED'
      );
      expect(error.response).toHaveProperty('feature', 'projects');
    });
  });

  describe('ensureCanCreateProject', () => {
    it('should not throw when within project limit', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      prismaMock.project.count.mockResolvedValue(4); // Pro plan allows 5, so 4 is within limit

      await expect(
        service.ensureCanCreateProject('user-1')
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when project limit reached', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'free',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);
      prismaMock.project.count.mockResolvedValue(1); // Free plan allows 1 project

      await expect(service.ensureCanCreateProject('user-1')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('canAutoApplyMetadataAutomations', () => {
    it('should return false for free plan', async () => {
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      const result = await service.canAutoApplyMetadataAutomations('user-1');

      expect(result).toBe(false);
    });

    it('should return true for pro plan', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'pro',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.canAutoApplyMetadataAutomations('user-1');

      expect(result).toBe(true);
    });

    it('should return true for business plan', async () => {
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'business',
        status: 'active',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.canAutoApplyMetadataAutomations('user-1');

      expect(result).toBe(true);
    });
  });
});
