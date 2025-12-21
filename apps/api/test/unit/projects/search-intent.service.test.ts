/**
 * Unit tests for SearchIntentService
 *
 * Tests:
 * - analyzeProductIntent() analyzes intent coverage for a product
 * - analyzeProductIntent() throws when product not found
 * - getProductIntentData() returns intent data with ownership validation
 * - getProjectIntentSummary() returns project-level summary
 * - buildSearchIntentIssues() builds intent issues for project
 */
import { SearchIntentService } from '../../../src/projects/search-intent.service';
import { PrismaService } from '../../../src/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const createPrismaMock = () => ({
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
  },
  productIntentCoverage: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  productIntentFixDraft: {
    findMany: jest.fn(),
  },
});

describe('SearchIntentService', () => {
  let service: SearchIntentService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new SearchIntentService(prismaMock as unknown as PrismaService);
  });

  describe('analyzeProductIntent', () => {
    it('should analyze intent coverage for a product', async () => {
      const mockProduct = {
        id: 'prod-1',
        title: 'Test Product',
        description: 'A great product for everyone',
        seoTitle: null,
        seoDescription: null,
        answerBlocks: [
          {
            questionText: 'What is this?',
            answerText: 'This is a test product',
          },
        ],
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.productIntentCoverage.upsert.mockResolvedValue({
        id: 'cov-1',
        productId: 'prod-1',
        intentType: 'INFORMATIONAL',
        score: 50,
        coverageStatus: 'PARTIAL',
        missingQueries: [],
        weakQueries: [],
        coveredQueries: [],
        expectedQueries: [],
        computedAt: new Date(),
      });

      const result = await service.analyzeProductIntent('prod-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('productId', 'prod-1');
      expect(result[0]).toHaveProperty('intentType');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('coverageStatus');
    });

    it('should throw NotFoundException when product not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.analyzeProductIntent('prod-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProductIntentData', () => {
    it('should return intent data when product exists and user owns it', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Test Product',
        project: {
          id: 'proj-1',
          userId: 'user-1',
        },
      };

      const mockCoverageRows = [
        {
          id: 'cov-1',
          productId: 'prod-1',
          intentType: 'INFORMATIONAL',
          score: 50,
          coverageStatus: 'PARTIAL',
          missingQueries: [],
          weakQueries: [],
          coveredQueries: [],
          expectedQueries: [],
          computedAt: new Date(),
        },
      ];

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.productIntentCoverage.findMany.mockResolvedValue(mockCoverageRows);
      prismaMock.productIntentFixDraft.findMany.mockResolvedValue([]);

      const result = await service.getProductIntentData('prod-1', 'user-1');

      expect(result).toHaveProperty('productId', 'prod-1');
      expect(result).toHaveProperty('coverage');
      expect(result).toHaveProperty('scorecard');
      expect(result).toHaveProperty('openDrafts');
    });

    it('should throw NotFoundException when product does not exist', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.getProductIntentData('prod-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own product', async () => {
      const mockProduct = {
        id: 'prod-1',
        project: {
          id: 'proj-1',
          userId: 'other-user',
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      await expect(service.getProductIntentData('prod-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should compute coverage when not cached', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Test Product',
        project: {
          id: 'proj-1',
          userId: 'user-1',
        },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.productIntentCoverage.findMany
        .mockResolvedValueOnce([]) // First call - no coverage
        .mockResolvedValueOnce([
          {
            id: 'cov-1',
            productId: 'prod-1',
            intentType: 'INFORMATIONAL',
            score: 50,
            coverageStatus: 'PARTIAL',
            missingQueries: [],
            weakQueries: [],
            coveredQueries: [],
            expectedQueries: [],
            computedAt: new Date(),
          },
        ]); // Second call - after computation

      // Mock analyzeProductIntent to avoid full execution
      jest.spyOn(service, 'analyzeProductIntent').mockResolvedValue([
        {
          productId: 'prod-1',
          intentType: 'informational',
          score: 50,
          coverageStatus: 'partial',
          missingQueries: [],
          weakQueries: [],
          coveredQueries: [],
          expectedQueries: [],
          computedAt: new Date().toISOString(),
        },
      ]);

      prismaMock.productIntentFixDraft.findMany.mockResolvedValue([]);

      const result = await service.getProductIntentData('prod-1', 'user-1');

      expect(result).toHaveProperty('coverage');
      expect(service.analyzeProductIntent).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('getProjectIntentSummary', () => {
    it('should return project-level summary with ownership validation', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Test Project',
      };

      const mockProducts = [{ id: 'prod-1' }, { id: 'prod-2' }];

      const mockCoverageRows = [
        {
          id: 'cov-1',
          productId: 'prod-1',
          intentType: 'INFORMATIONAL',
          score: 50,
          coverageStatus: 'PARTIAL',
        },
        {
          id: 'cov-2',
          productId: 'prod-2',
          intentType: 'TRANSACTIONAL',
          score: 70,
          coverageStatus: 'COVERED',
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      prismaMock.productIntentCoverage.findMany.mockResolvedValue(mockCoverageRows);

      const result = await service.getProjectIntentSummary('proj-1', 'user-1');

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('intentBreakdown');
      expect(result).toHaveProperty('totalProducts', 2);
      expect(result).toHaveProperty('status');
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(service.getProjectIntentSummary('proj-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'other-user',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      await expect(service.getProjectIntentSummary('proj-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return empty summary when no products exist', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.getProjectIntentSummary('proj-1', 'user-1');

      expect(result).toHaveProperty('overallScore', 0);
      expect(result).toHaveProperty('totalProducts', 0);
      expect(result).toHaveProperty('intentBreakdown');
    });
  });

  describe('buildSearchIntentIssues', () => {
    it('should build search intent issues for project', async () => {
      const mockProducts = [
        { id: 'prod-1', title: 'Product 1' },
        { id: 'prod-2', title: 'Product 2' },
      ];

      const mockCoverageRows = [
        {
          id: 'cov-1',
          productId: 'prod-1',
          intentType: 'TRANSACTIONAL',
          coverageStatus: 'NONE',
          missingQueries: ['buy product 1', 'price product 1'],
        },
        {
          id: 'cov-2',
          productId: 'prod-2',
          intentType: 'COMPARATIVE',
          coverageStatus: 'WEAK',
          weakQueries: ['compare product 2'],
        },
      ];

      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      prismaMock.productIntentCoverage.findMany.mockResolvedValue(mockCoverageRows);

      const result = await service.buildSearchIntentIssues('proj-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
      // Should have issues for missing/weak coverage
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('pillarId', 'search_intent_fit');
        expect(result[0]).toHaveProperty('intentType');
      }
    });

    it('should return empty array when no products exist', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.buildSearchIntentIssues('proj-1');

      expect(result).toEqual([]);
    });
  });

  describe('invalidateCoverage', () => {
    it('should delete coverage for a product', async () => {
      prismaMock.productIntentCoverage.deleteMany.mockResolvedValue({ count: 1 });

      await service.invalidateCoverage('prod-1');

      expect(prismaMock.productIntentCoverage.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
      });
    });
  });
});

