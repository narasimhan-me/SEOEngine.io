/**
 * Unit tests for TokenUsageService
 *
 * Tests:
 * - log() creates token usage records
 * - log() skips invalid inputs
 * - getMonthlyUsage() calculates monthly totals correctly
 * - getMonthlyUsage() returns 0 for invalid userId
 */
import { TokenUsageService } from '../../../src/ai/token-usage.service';
import { PrismaService } from '../../../src/prisma.service';

const createPrismaMock = () => ({
  tokenUsage: {
    create: jest.fn(),
    aggregate: jest.fn(),
  },
});

describe('TokenUsageService', () => {
  let service: TokenUsageService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new TokenUsageService(prismaMock as unknown as PrismaService);
  });

  describe('log', () => {
    it('should create token usage record with valid inputs', async () => {
      const mockTokenUsage = {
        id: 'token-1',
        userId: 'user-1',
        amount: 100,
        source: 'metadata-generation',
        createdAt: new Date(),
      };

      prismaMock.tokenUsage.create.mockResolvedValue(mockTokenUsage);

      await service.log('user-1', 100, 'metadata-generation');

      expect(prismaMock.tokenUsage.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          amount: 100,
          source: 'metadata-generation',
        },
      });
    });

    it('should skip logging when userId is empty', async () => {
      await service.log('', 100, 'metadata-generation');
      expect(prismaMock.tokenUsage.create).not.toHaveBeenCalled();
    });

    it('should skip logging when source is empty', async () => {
      await service.log('user-1', 100, '');
      expect(prismaMock.tokenUsage.create).not.toHaveBeenCalled();
    });

    it('should skip logging when amount is zero or negative', async () => {
      await service.log('user-1', 0, 'metadata-generation');
      expect(prismaMock.tokenUsage.create).not.toHaveBeenCalled();

      await service.log('user-1', -10, 'metadata-generation');
      expect(prismaMock.tokenUsage.create).not.toHaveBeenCalled();
    });
  });

  describe('getMonthlyUsage', () => {
    it('should calculate monthly usage correctly', async () => {
      const startOfMonth = new Date();
      startOfMonth.setUTCDate(1);
      startOfMonth.setUTCHours(0, 0, 0, 0);

      prismaMock.tokenUsage.aggregate.mockResolvedValue({
        _sum: { amount: 1500 },
      });

      const result = await service.getMonthlyUsage('user-1');

      expect(result).toBe(1500);
      expect(prismaMock.tokenUsage.aggregate).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      });
    });

    it('should return 0 when no usage exists', async () => {
      prismaMock.tokenUsage.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getMonthlyUsage('user-1');

      expect(result).toBe(0);
    });

    it('should return 0 for empty userId', async () => {
      const result = await service.getMonthlyUsage('');

      expect(result).toBe(0);
      expect(prismaMock.tokenUsage.aggregate).not.toHaveBeenCalled();
    });

    it('should handle null sum result', async () => {
      prismaMock.tokenUsage.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getMonthlyUsage('user-1');

      expect(result).toBe(0);
    });
  });
});
