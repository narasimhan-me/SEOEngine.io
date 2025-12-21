/**
 * Unit tests for DeoIssuesService
 *
 * Tests:
 * - getIssuesForProject() returns issues with ownership validation
 * - getIssuesForProject() builds various issue types
 * - Error handling for missing project or unauthorized access
 */
import { DeoIssuesService } from '../../../src/projects/deo-issues.service';
import { PrismaService } from '../../../src/prisma.service';
import { DeoSignalsService } from '../../../src/projects/deo-score.service';
import { AutomationService } from '../../../src/projects/automation.service';
import { SearchIntentService } from '../../../src/projects/search-intent.service';
import { CompetitorsService } from '../../../src/projects/competitors.service';
import { OffsiteSignalsService } from '../../../src/projects/offsite-signals.service';
import { LocalDiscoveryService } from '../../../src/projects/local-discovery.service';
import { MediaAccessibilityService } from '../../../src/projects/media-accessibility.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeoScoreSignals } from '@engineo/shared';

const createPrismaMock = () => ({
  project: {
    findUnique: jest.fn(),
  },
  crawlResult: {
    findMany: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
});

const createDeoSignalsServiceMock = () => ({
  collectSignalsForProject: jest.fn(),
});

const createServiceMocks = () => ({
  automationService: {
    triggerAnswerBlockAutomationForProduct: jest.fn().mockResolvedValue(undefined),
  },
  searchIntentService: {
    buildSearchIntentIssues: jest.fn().mockResolvedValue([]),
  },
  competitorsService: {
    buildCompetitiveIssues: jest.fn().mockResolvedValue([]),
  },
  offsiteSignalsService: {
    buildOffsiteIssuesForProject: jest.fn().mockResolvedValue([]),
  },
  localDiscoveryService: {
    buildLocalIssuesForProject: jest.fn().mockResolvedValue([]),
  },
  mediaAccessibilityService: {
    buildMediaIssuesForProject: jest.fn().mockResolvedValue([]),
  },
});

describe('DeoIssuesService', () => {
  let service: DeoIssuesService;
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let deoSignalsServiceMock: ReturnType<typeof createDeoSignalsServiceMock>;
  let serviceMocks: ReturnType<typeof createServiceMocks>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    deoSignalsServiceMock = createDeoSignalsServiceMock();
    serviceMocks = createServiceMocks();

    service = new DeoIssuesService(
      prismaMock as unknown as PrismaService,
      deoSignalsServiceMock as unknown as DeoSignalsService,
      serviceMocks.automationService as unknown as AutomationService,
      serviceMocks.searchIntentService as unknown as SearchIntentService,
      serviceMocks.competitorsService as unknown as CompetitorsService,
      serviceMocks.offsiteSignalsService as unknown as OffsiteSignalsService,
      serviceMocks.localDiscoveryService as unknown as LocalDiscoveryService,
      serviceMocks.mediaAccessibilityService as unknown as MediaAccessibilityService,
    );
  });

  describe('getIssuesForProject', () => {
    it('should return issues when project exists and user owns it', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Test Project',
      };

      const mockCrawlResults = [
        {
          id: 'crawl-1',
          projectId: 'proj-1',
          url: 'https://example.com/page1',
          title: 'Page 1',
          metaDescription: 'Description 1',
          wordCount: 500,
        },
      ];

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          description: 'Product description',
          seoTitle: null,
          seoDescription: null,
        },
      ];

      const mockSignals: DeoScoreSignals = {
        contentCoverage: 0.8,
        contentDepth: 0.7,
        contentFreshness: 0.8,
        entityCoverage: 0.7,
        entityAccuracy: 0.7,
        entityLinkage: 0.6,
        crawlHealth: 1,
        indexability: 1,
        serpPresence: 0.8,
        answerSurfacePresence: 0.7,
        brandNavigationalStrength: 0.5,
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue(mockSignals);

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      expect(result).toHaveProperty('projectId', 'proj-1');
      expect(result).toHaveProperty('issues');
      expect(Array.isArray(result.issues)).toBe(true);
      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(service.getIssuesForProject('proj-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own project', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'other-user',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);

      await expect(service.getIssuesForProject('proj-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should include issues from various services', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockSearchIntentIssues = [
        {
          id: 'issue-1',
          pillarId: 'search_intent' as const,
          title: 'Search Intent Issue',
        },
      ];

      const mockCompetitiveIssues = [
        {
          id: 'issue-2',
          pillarId: 'competitors' as const,
          title: 'Competitive Issue',
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue([]);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0,
        contentDepth: 0,
        contentFreshness: 0,
        entityCoverage: 0,
        entityAccuracy: 0.5,
        entityLinkage: 0,
        crawlHealth: 0,
        indexability: 0,
        serpPresence: 0,
        answerSurfacePresence: 0,
        brandNavigationalStrength: 0,
      });
      serviceMocks.searchIntentService.buildSearchIntentIssues.mockResolvedValue(
        mockSearchIntentIssues,
      );
      serviceMocks.competitorsService.buildCompetitiveIssues.mockResolvedValue(
        mockCompetitiveIssues,
      );

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      expect(result.issues.length).toBeGreaterThanOrEqual(2);
      expect(
        result.issues.some((issue) => issue.pillarId === 'search_intent'),
      ).toBe(true);
      expect(
        result.issues.some((issue) => issue.pillarId === 'competitors'),
      ).toBe(true);
    });

    it('should handle errors from service calls gracefully', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue([]);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0,
        contentDepth: 0,
        contentFreshness: 0,
        entityCoverage: 0,
        entityAccuracy: 0.5,
        entityLinkage: 0,
        crawlHealth: 0,
        indexability: 0,
        serpPresence: 0,
        answerSurfacePresence: 0,
        brandNavigationalStrength: 0,
      });
      serviceMocks.searchIntentService.buildSearchIntentIssues.mockRejectedValue(
        new Error('Service error'),
      );

      // Should not throw, but log error and continue
      const result = await service.getIssuesForProject('proj-1', 'user-1');

      expect(result).toHaveProperty('issues');
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should build missing metadata issue when pages/products lack titles/descriptions', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockCrawlResults = [
        {
          id: 'crawl-1',
          projectId: 'proj-1',
          url: 'https://example.com/page1',
          title: null, // Missing title
          metaDescription: null, // Missing description
          wordCount: 500,
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: 'Page 2',
          metaDescription: null, // Missing description
          wordCount: 500,
        },
      ];

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: null, // Missing SEO title
          seoDescription: null, // Missing SEO description
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 0.5,
        serpPresence: 0.5,
        answerSurfacePresence: 0.5,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const missingMetadataIssue = result.issues.find((issue) => issue.id === 'missing_metadata');
      expect(missingMetadataIssue).toBeDefined();
      expect(missingMetadataIssue?.count).toBeGreaterThan(0);
    });

    it('should build thin content issue when pages/products have low word counts', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockCrawlResults = [
        {
          id: 'crawl-1',
          projectId: 'proj-1',
          url: 'https://example.com/page1',
          title: 'Page 1',
          metaDescription: 'Description 1',
          wordCount: 50, // Thin content
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: 'Page 2',
          metaDescription: 'Description 2',
          wordCount: 100, // Thin content
        },
      ];

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: 'SEO Title 1',
          description: 'Short', // Thin content
          seoDescription: 'SEO Description 1',
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.2,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 0.5,
        serpPresence: 0.5,
        answerSurfacePresence: 0.2,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const thinContentIssue = result.issues.find((issue) => issue.id === 'thin_content');
      expect(thinContentIssue).toBeDefined();
      expect(thinContentIssue?.count).toBeGreaterThan(0);
    });

    it('should build missing SEO title issue for products without seoTitle', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: null, // Missing SEO title
          seoDescription: 'Description 1',
        },
        {
          id: 'prod-2',
          projectId: 'proj-1',
          title: 'Product 2',
          seoTitle: null, // Missing SEO title
          seoDescription: 'Description 2',
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 1,
        serpPresence: 0.5,
        answerSurfacePresence: 0.5,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const missingSeoTitleIssue = result.issues.find((issue) => issue.id === 'missing_seo_title');
      expect(missingSeoTitleIssue).toBeDefined();
      expect(missingSeoTitleIssue?.count).toBe(2);
      expect(missingSeoTitleIssue?.aiFixable).toBe(true);
    });

    it('should build missing SEO description issue for products without seoDescription', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: 'SEO Title 1',
          seoDescription: null, // Missing SEO description
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 1,
        serpPresence: 0.5,
        answerSurfacePresence: 0.5,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const missingSeoDescIssue = result.issues.find(
        (issue) => issue.id === 'missing_seo_description',
      );
      expect(missingSeoDescIssue).toBeDefined();
      expect(missingSeoDescIssue?.count).toBe(1);
      expect(missingSeoDescIssue?.aiFixable).toBe(true);
    });

    it('should build weak title issue for products with short or unoptimized titles', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: 'Short', // Too short (< 20 chars)
          seoDescription: 'Description 1',
        },
        {
          id: 'prod-2',
          projectId: 'proj-1',
          title: 'Product 2',
          seoTitle: 'Product 2', // Same as title (not optimized)
          seoDescription: 'Description 2',
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 1,
        serpPresence: 0.5,
        answerSurfacePresence: 0.5,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const weakTitleIssue = result.issues.find((issue) => issue.id === 'weak_title');
      expect(weakTitleIssue).toBeDefined();
      expect(weakTitleIssue?.count).toBeGreaterThanOrEqual(1);
    });

    it('should build weak description issue for products with short descriptions', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: 'SEO Title 1',
          seoDescription: 'Short', // Too short (< 80 chars)
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 1,
        serpPresence: 0.5,
        answerSurfacePresence: 0.5,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const weakDescIssue = result.issues.find((issue) => issue.id === 'weak_description');
      expect(weakDescIssue).toBeDefined();
      expect(weakDescIssue?.count).toBe(1);
    });

    it('should build duplicate product content issue when products share identical descriptions', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const duplicateDescription = 'This is a duplicate product description that appears multiple times';
      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: 'SEO Title 1',
          seoDescription: duplicateDescription,
          description: duplicateDescription,
        },
        {
          id: 'prod-2',
          projectId: 'proj-1',
          title: 'Product 2',
          seoTitle: 'SEO Title 2',
          seoDescription: duplicateDescription, // Same description
          description: duplicateDescription,
        },
        {
          id: 'prod-3',
          projectId: 'proj-1',
          title: 'Product 3',
          seoTitle: 'SEO Title 3',
          seoDescription: duplicateDescription, // Same description
          description: duplicateDescription,
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 1,
        serpPresence: 0.5,
        answerSurfacePresence: 0.5,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const duplicateIssue = result.issues.find(
        (issue) => issue.id === 'duplicate_product_content',
      );
      expect(duplicateIssue).toBeDefined();
      expect(duplicateIssue?.count).toBeGreaterThanOrEqual(2);
    });

    it('should build not answer-ready issue for products with insufficient content', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: 'SEO Title 1',
          description: 'Short', // Total content < 80 words
          seoDescription: 'Also short',
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.2,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 1,
        serpPresence: 0.5,
        answerSurfacePresence: 0.2,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const notAnswerReadyIssue = result.issues.find((issue) => issue.id === 'not_answer_ready');
      expect(notAnswerReadyIssue).toBeDefined();
      expect(notAnswerReadyIssue?.count).toBe(1);
    });

    it('should build missing product image issue for products without images', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: 'SEO Title 1',
          seoDescription: 'Description 1',
          imageUrls: null, // No images
        },
        {
          id: 'prod-2',
          projectId: 'proj-1',
          title: 'Product 2',
          seoTitle: 'SEO Title 2',
          seoDescription: 'Description 2',
          imageUrls: [], // Empty array
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 1,
        serpPresence: 0.5,
        answerSurfacePresence: 0.5,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const missingImageIssue = result.issues.find(
        (issue) => issue.id === 'missing_product_image',
      );
      expect(missingImageIssue).toBeDefined();
      expect(missingImageIssue?.count).toBe(2);
    });

    it('should build missing price issue for products without price', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: 'SEO Title 1',
          seoDescription: 'Description 1',
          price: null, // No price
        },
        {
          id: 'prod-2',
          projectId: 'proj-1',
          title: 'Product 2',
          seoTitle: 'SEO Title 2',
          seoDescription: 'Description 2',
          price: 0, // Zero price
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 1,
        serpPresence: 0.5,
        answerSurfacePresence: 0.5,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const missingPriceIssue = result.issues.find((issue) => issue.id === 'missing_price');
      expect(missingPriceIssue).toBeDefined();
      expect(missingPriceIssue?.count).toBe(2);
    });

    it('should build indexability issue for pages with crawl/indexing problems', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockCrawlResults = [
        {
          id: 'crawl-1',
          projectId: 'proj-1',
          url: 'https://example.com/page1',
          title: null, // Missing title
          metaDescription: null, // Missing description
          h1: null, // Missing H1
          wordCount: 500,
          statusCode: 200,
          issues: [],
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: 'Page 2',
          metaDescription: 'Description 2',
          h1: 'Heading 2',
          wordCount: 500,
          statusCode: 500, // Error status
          issues: ['HTTP_ERROR'],
        },
        {
          id: 'crawl-3',
          projectId: 'proj-1',
          url: 'https://example.com/page3',
          title: 'Page 3',
          metaDescription: 'Description 3',
          h1: 'Heading 3',
          wordCount: 500,
          statusCode: 200,
          issues: ['NOINDEX'], // Noindex directive
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue([]);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 0.33,
        indexability: 0.33,
        serpPresence: 0.33,
        answerSurfacePresence: 0.5,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const indexabilityIssue = result.issues.find(
        (issue) => issue.id === 'indexability_problems',
      );
      expect(indexabilityIssue).toBeDefined();
      expect(indexabilityIssue?.count).toBeGreaterThan(0);
    });

    it('should build crawl health issue for pages with HTTP errors', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockCrawlResults = [
        {
          id: 'crawl-1',
          projectId: 'proj-1',
          url: 'https://example.com/page1',
          title: 'Page 1',
          metaDescription: 'Description 1',
          h1: 'Heading 1',
          wordCount: 500,
          statusCode: 500, // Error status
          issues: ['HTTP_ERROR'],
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: 'Page 2',
          metaDescription: 'Description 2',
          h1: 'Heading 2',
          wordCount: 500,
          statusCode: 404, // Error status
          issues: ['FETCH_ERROR'],
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue([]);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 0, // All pages have errors
        indexability: 0,
        serpPresence: 0.5,
        answerSurfacePresence: 0.5,
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const crawlHealthIssue = result.issues.find((issue) => issue.id === 'crawl_health_errors');
      expect(crawlHealthIssue).toBeDefined();
      expect(crawlHealthIssue?.count).toBe(2);
    });

    it('should build answer surface issue for pages with weak answerability', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockCrawlResults = [
        {
          id: 'crawl-1',
          projectId: 'proj-1',
          url: 'https://example.com/page1',
          title: 'Page 1',
          metaDescription: 'Description 1',
          h1: null, // Missing H1
          wordCount: 500,
          statusCode: 200,
          issues: [],
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: 'Page 2',
          metaDescription: 'Description 2',
          h1: 'Heading 2',
          wordCount: 200, // < 400 words
          statusCode: 200,
          issues: [],
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue([]);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 0.5,
        serpPresence: 0.5,
        answerSurfacePresence: 0, // No answer-ready pages
        brandNavigationalStrength: 0,
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const answerSurfaceIssue = result.issues.find(
        (issue) => issue.id === 'answer_surface_weakness',
      );
      expect(answerSurfaceIssue).toBeDefined();
      expect(answerSurfaceIssue?.count).toBeGreaterThan(0);
    });

    it('should build brand navigational issue when canonical pages are missing', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockCrawlResults = [
        {
          id: 'crawl-1',
          projectId: 'proj-1',
          url: 'https://example.com/some-other-page',
          title: 'Some Page',
          metaDescription: 'Description',
          h1: 'Heading',
          wordCount: 500,
          statusCode: 200,
          issues: [],
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue([]);
      deoSignalsServiceMock.collectSignalsForProject.mockResolvedValue({
        contentCoverage: 0.5,
        contentDepth: 0.5,
        contentFreshness: 0.5,
        entityCoverage: 0.5,
        entityAccuracy: 0.5,
        entityLinkage: 0.5,
        crawlHealth: 1,
        indexability: 1,
        serpPresence: 0.5,
        answerSurfacePresence: 0.5,
        brandNavigationalStrength: 0, // No navigational pages
      });

      const result = await service.getIssuesForProject('proj-1', 'user-1');

      const brandNavIssue = result.issues.find(
        (issue) => issue.id === 'brand_navigational_weakness',
      );
      expect(brandNavIssue).toBeDefined();
      expect(brandNavIssue?.count).toBeGreaterThan(0);
    });
  });
});

