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
  project: {
    findUnique: jest.fn(),
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

    it('should aggregate issues by gap type and area', async () => {
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
              gapType: 'intent_gap',
              merchantCovers: false,
              oneCompetitorCovers: true,
              twoOrMoreCompetitorsCovers: true,
              severityWeight: 10,
              intentType: 'transactional',
            },
          ],
          overallScore: 40,
          areasWhereCompetitorsLead: 1,
          status: 'BEHIND',
        },
        {
          id: 'cov-2',
          productId: 'prod-2',
          coverageData: [
            {
              areaId: 'transactional_intent',
              gapType: 'intent_gap',
              merchantCovers: false,
              oneCompetitorCovers: true,
              twoOrMoreCompetitorsCovers: false,
              severityWeight: 10,
              intentType: 'transactional',
            },
          ],
          overallScore: 50,
          areasWhereCompetitorsLead: 1,
          status: 'BEHIND',
        },
      ];

      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      prismaMock.productCompetitiveCoverage.findMany.mockResolvedValue(
        mockCoverageRows
      );

      const result = await service.buildCompetitiveIssues('proj-1');

      // Should aggregate both products into one issue
      const intentIssue = result.find(
        (i) => i.competitiveAreaId === 'transactional_intent'
      );
      expect(intentIssue).toBeDefined();
      expect(intentIssue?.affectedProducts).toHaveLength(2);
      expect(intentIssue?.pillarId).toBe('competitive_positioning');
    });

    it('should skip areas where merchant covers or no competitor covers', async () => {
      const mockProducts = [{ id: 'prod-1', title: 'Product 1' }];

      const mockCoverageRows = [
        {
          id: 'cov-1',
          productId: 'prod-1',
          coverageData: [
            {
              areaId: 'transactional_intent',
              gapType: 'intent_gap',
              merchantCovers: true, // Merchant covers
              oneCompetitorCovers: true,
              severityWeight: 10,
            },
            {
              areaId: 'comparison_section',
              gapType: 'content_section_gap',
              merchantCovers: false,
              oneCompetitorCovers: false, // No competitor covers
              severityWeight: 8,
            },
          ],
          overallScore: 70,
          areasWhereCompetitorsLead: 0,
          status: 'ON_PAR',
        },
      ];

      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      prismaMock.productCompetitiveCoverage.findMany.mockResolvedValue(
        mockCoverageRows
      );

      const result = await service.buildCompetitiveIssues('proj-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getProjectCompetitiveScorecard', () => {
    it('should return scorecard with aggregated metrics', async () => {
      prismaMock.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'prod-1' },
        { id: 'prod-2' },
      ]);
      prismaMock.productCompetitiveCoverage.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          overallScore: 80,
          areasWhereCompetitorsLead: 1,
          status: 'AHEAD',
          coverageData: [
            {
              areaId: 'transactional_intent',
              gapType: 'intent_gap',
              merchantCovers: true,
            },
          ],
        },
        {
          productId: 'prod-2',
          overallScore: 40,
          areasWhereCompetitorsLead: 3,
          status: 'BEHIND',
          coverageData: [
            {
              areaId: 'transactional_intent',
              gapType: 'intent_gap',
              merchantCovers: false,
            },
          ],
        },
      ]);

      const result = await service.getProjectCompetitiveScorecard(
        'proj-1',
        'user-1'
      );

      expect(result.totalProducts).toBe(2);
      expect(result.productsAhead).toBe(1);
      expect(result.productsBehind).toBe(1);
      expect(result.overallScore).toBe(60); // (80 + 40) / 2
      expect(result.gapBreakdown).toBeDefined();
    });

    it('should throw NotFoundException when project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        service.getProjectCompetitiveScorecard('proj-1', 'user-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should return default scorecard when no products exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.getProjectCompetitiveScorecard(
        'proj-1',
        'user-1'
      );

      expect(result.totalProducts).toBe(0);
      expect(result.overallScore).toBe(0);
      expect(result.status).toBe('Behind');
      expect(result.gapBreakdown).toHaveLength(3);
    });

    it('should throw ForbiddenException when user lacks access', async () => {
      prismaMock.project.findUnique.mockResolvedValue({ id: 'proj-1' });
      roleResolutionServiceMock.assertProjectAccess.mockRejectedValue(
        new ForbiddenException('Access denied')
      );

      await expect(
        service.getProjectCompetitiveScorecard('proj-1', 'user-1')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('analyzeProductCompetitiveCoverage', () => {
    it('should analyze coverage and create heuristic competitors', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Test Widget Product',
        description: 'A test description with buy keyword',
        seoTitle: null,
        seoDescription: null,
        answerBlocks: [],
        intentCoverages: [],
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.productCompetitor.findMany.mockResolvedValue([]);
      prismaMock.productCompetitor.create.mockResolvedValue({});
      prismaMock.productCompetitiveCoverage.upsert.mockResolvedValue({});

      const result = await service.analyzeProductCompetitiveCoverage('prod-1');

      expect(result.productId).toBe('prod-1');
      expect(result.competitors).toBeDefined();
      expect(result.coverageAreas).toBeDefined();
      expect(result.overallScore).toBeDefined();
      expect(result.status).toBeDefined();

      // Should have created heuristic competitors
      expect(prismaMock.productCompetitor.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent product', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(
        service.analyzeProductCompetitiveCoverage('prod-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should detect intent coverage from product data', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Premium Widget',
        description: 'Compare this to alternatives, buy now with guarantee',
        seoTitle: 'Best Widget - Why Choose Us',
        seoDescription: 'FAQ about our product features',
        answerBlocks: [
          {
            questionText: 'What is it?',
            answerText: 'This product helps you with buying decisions',
          },
        ],
        intentCoverages: [
          { intentType: 'TRANSACTIONAL', coverageStatus: 'COVERED' },
        ],
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.productCompetitor.findMany.mockResolvedValue([
        { id: 'comp-1', displayName: 'Competitor A', source: 'heuristic_category' },
      ]);
      prismaMock.productCompetitiveCoverage.upsert.mockResolvedValue({});

      const result = await service.analyzeProductCompetitiveCoverage('prod-1');

      // Should detect multiple coverage areas
      expect(result.coverageAreas.some((a) => a.merchantCovers)).toBe(true);
      expect(result.overallScore).toBeGreaterThan(0);
    });
  });

  describe('invalidateCoverage', () => {
    it('should delete coverage for a product', async () => {
      prismaMock.productCompetitiveCoverage.deleteMany.mockResolvedValue({
        count: 1,
      });

      await service.invalidateCoverage('prod-1');

      expect(
        prismaMock.productCompetitiveCoverage.deleteMany
      ).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
      });
    });
  });

  describe('getProductCompetitiveData - with drafts', () => {
    it('should include open drafts in response', async () => {
      const mockProduct = {
        id: 'prod-1',
        projectId: 'proj-1',
        title: 'Test Product',
        description: 'Test',
        seoTitle: null,
        seoDescription: null,
        project: { id: 'proj-1', userId: 'user-1' },
        competitors: [
          {
            id: 'comp-1',
            displayName: 'Competitor A',
            logoUrl: null,
            homepageUrl: null,
            source: 'heuristic_category',
          },
        ],
      };

      const mockCoverage = {
        productId: 'prod-1',
        coverageData: [
          {
            areaId: 'transactional_intent',
            gapType: 'intent_gap',
            merchantCovers: false,
            oneCompetitorCovers: true,
            twoOrMoreCompetitorsCovers: false,
            severityWeight: 10,
            intentType: 'transactional',
          },
        ],
        overallScore: 50,
        areasWhereCompetitorsLead: 1,
        status: 'BEHIND',
        computedAt: new Date(),
      };

      const mockDrafts = [
        {
          id: 'draft-1',
          productId: 'prod-1',
          gapType: 'INTENT_GAP',
          intentType: 'TRANSACTIONAL',
          areaId: 'transactional_intent',
          draftType: 'ANSWER_BLOCK',
          draftPayload: { text: 'Draft answer' },
          aiWorkKey: 'work-123',
          reusedFromWorkKey: null,
          generatedWithAi: true,
          createdAt: new Date(),
          expiresAt: null,
        },
      ];

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.productCompetitiveCoverage.findUnique.mockResolvedValue(
        mockCoverage
      );
      prismaMock.productCompetitiveFixDraft.findMany.mockResolvedValue(
        mockDrafts
      );

      const result = await service.getProductCompetitiveData(
        'prod-1',
        'user-1'
      );

      expect(result.openDrafts).toHaveLength(1);
      expect(result.openDrafts[0].draftType).toBe('answer_block');
      expect(result.openDrafts[0].gapType).toBe('intent_gap');
    });
  });

});
