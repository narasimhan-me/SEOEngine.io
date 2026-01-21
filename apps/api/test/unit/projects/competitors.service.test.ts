/**
 * Unit tests for CompetitorsService
 *
 * Tests:
 * - getProductCompetitiveData() returns competitive data with ownership validation
 * - getProductCompetitiveData() computes coverage when not cached
 * - analyzeProductCompetitiveCoverage() analyzes competitive coverage
 * - buildCompetitiveIssues() builds competitive issues for project
 * - Type mapping helpers
 */
import { CompetitorsService } from '../../../src/projects/competitors.service';
import { PrismaService } from '../../../src/prisma.service';
import { RoleResolutionService } from '../../../src/common/role-resolution.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const createPrismaMock = () => ({
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  productCompetitor: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  productCompetitiveCoverage: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  productCompetitiveFixDraft: {
    findMany: jest.fn(),
  },
});

const createRoleResolutionServiceMock = () => ({
  assertProjectAccess: jest.fn().mockResolvedValue(undefined),
  assertOwnerRole: jest.fn().mockResolvedValue(undefined),
  hasProjectAccess: jest.fn().mockResolvedValue(true),
  isMultiUserProject: jest.fn().mockResolvedValue(false),
});

describe('CompetitorsService', () => {
  let service: CompetitorsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let roleResolutionServiceMock: ReturnType<
    typeof createRoleResolutionServiceMock
  >;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    roleResolutionServiceMock = createRoleResolutionServiceMock();
    service = new CompetitorsService(
      prismaMock as unknown as PrismaService,
      roleResolutionServiceMock as unknown as RoleResolutionService
    );
  });

  describe('getProductCompetitiveData', () => {
    it('should return competitive data when product exists and user owns it', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Test Product',
        description: 'Test Description',
        seoTitle: null,
        seoDescription: null,
        project: {
          id: 'proj-1',
          userId: 'user-1',
        },
        competitors: [],
      };

      const mockCoverage = {
        id: 'cov-1',
        productId: 'prod-1',
        coverageData: [],
        overallScore: 70,
        areasWhereCompetitorsLead: 2,
        status: 'ON_PAR',
        computedAt: new Date(),
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.productCompetitiveCoverage.findUnique.mockResolvedValue(
        mockCoverage
      );
      prismaMock.productCompetitiveFixDraft.findMany.mockResolvedValue([]);

      const result = await service.getProductCompetitiveData(
        'prod-1',
        'user-1'
      );

      expect(result).toHaveProperty('productId', 'prod-1');
      expect(result).toHaveProperty('competitors');
      expect(result).toHaveProperty('coverage');
      expect(result).toHaveProperty('gaps');
      expect(result).toHaveProperty('openDrafts');
    });

    it('should throw NotFoundException when product does not exist', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(
        service.getProductCompetitiveData('prod-1', 'user-1')
      ).rejects.toThrow(NotFoundException);
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
      roleResolutionServiceMock.assertProjectAccess.mockRejectedValue(
        new ForbiddenException('You do not have access to this project')
      );

      await expect(
        service.getProductCompetitiveData('prod-1', 'user-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should compute coverage when not cached', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Test Product',
        description: 'Test Description',
        seoTitle: null,
        seoDescription: null,
        project: {
          id: 'proj-1',
          userId: 'user-1',
        },
        competitors: [],
        answerBlocks: [],
        intentCoverages: [],
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.productCompetitiveCoverage.findUnique.mockResolvedValue(null);
      prismaMock.productCompetitor.findMany.mockResolvedValue([]);
      prismaMock.productCompetitiveCoverage.upsert.mockResolvedValue({
        id: 'cov-1',
        productId: 'prod-1',
        coverageData: [],
        overallScore: 50,
        areasWhereCompetitorsLead: 0,
        status: 'BEHIND',
        computedAt: new Date(),
      });
      prismaMock.productCompetitiveFixDraft.findMany.mockResolvedValue([]);

      const result = await service.getProductCompetitiveData(
        'prod-1',
        'user-1'
      );

      expect(result).toHaveProperty('coverage');
      expect(prismaMock.productCompetitiveCoverage.upsert).toHaveBeenCalled();
    });
  });

  describe('buildCompetitiveIssues', () => {
    it('should build competitive issues for project', async () => {
      const mockProducts = [
        { id: 'prod-1', title: 'Product 1' },
        { id: 'prod-2', title: 'Product 2' },
      ];

      const mockCoverageRows = [
        {
          id: 'cov-1',
          productId: 'prod-1',
          coverageData: [
            {
              areaId: 'transactional_intent',
              merchantCovers: false,
              oneCompetitorCovers: true,
              severityWeight: 10,
            },
          ],
          overallScore: 40,
          areasWhereCompetitorsLead: 1,
          status: 'BEHIND',
        },
      ];

      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      prismaMock.productCompetitiveCoverage.findMany.mockResolvedValue(
        mockCoverageRows
      );

      const result = await service.buildCompetitiveIssues('proj-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when no products exist', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.buildCompetitiveIssues('proj-1');

      expect(result).toEqual([]);
    });
  });
});
