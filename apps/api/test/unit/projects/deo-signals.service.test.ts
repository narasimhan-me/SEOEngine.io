/**
 * Unit tests for DeoSignalsService
 *
 * Tests:
 * - collectSignalsForProject() collects all signal types correctly
 * - Edge cases: empty projects, missing data, null/undefined values
 * - Content signals: coverage, depth, freshness
 * - Entity signals: hint coverage, structure accuracy, linkage density
 * - Technical signals: crawl health, indexability, HTML structural quality, thin content
 * - Visibility signals: SERP presence, answer surface presence, brand navigational strength
 */
import { DeoSignalsService } from '../../../src/projects/deo-score.service';
import { PrismaService } from '../../../src/prisma.service';
import { NotFoundException } from '@nestjs/common';

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

describe('DeoSignalsService', () => {
  let service: DeoSignalsService;
  let prismaMock: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new DeoSignalsService(prismaMock as unknown as PrismaService);
  });

  describe('collectSignalsForProject', () => {
    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(service.collectSignalsForProject('proj-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should collect signals for project with pages and products', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Test Project',
      };

      const now = Date.now();
      const recentDate = new Date(now - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const oldDate = new Date(now - 100 * 24 * 60 * 60 * 1000); // 100 days ago

      const mockCrawlResults = [
        {
          id: 'crawl-1',
          projectId: 'proj-1',
          url: 'https://example.com/page1',
          title: 'Page 1',
          metaDescription: 'Description 1',
          h1: 'Heading 1',
          wordCount: 800,
          statusCode: 200,
          scannedAt: recentDate,
          issues: [],
          internalLinkCount: 15,
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: 'Page 2',
          metaDescription: 'Description 2',
          h1: 'Heading 2',
          wordCount: 600,
          statusCode: 200,
          scannedAt: recentDate,
          issues: [],
          internalLinkCount: 10,
        },
      ];

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: 'SEO Title 1',
          description: 'Product description with enough words to be considered good',
          seoDescription: 'SEO Description 1',
          lastSyncedAt: recentDate,
        },
        {
          id: 'prod-2',
          projectId: 'proj-1',
          title: 'Product 2',
          seoTitle: 'SEO Title 2',
          description: 'Another product description',
          seoDescription: 'SEO Description 2',
          lastSyncedAt: recentDate,
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.collectSignalsForProject('proj-1');

      expect(result).toHaveProperty('contentCoverage');
      expect(result).toHaveProperty('contentDepth');
      expect(result).toHaveProperty('contentFreshness');
      expect(result).toHaveProperty('entityCoverage');
      expect(result).toHaveProperty('entityAccuracy');
      expect(result).toHaveProperty('entityLinkage');
      expect(result).toHaveProperty('crawlHealth');
      expect(result).toHaveProperty('indexability');
      expect(result).toHaveProperty('serpPresence');
      expect(result).toHaveProperty('answerSurfacePresence');
      expect(result).toHaveProperty('brandNavigationalStrength');

      // Content coverage should be high (all pages and products have titles/descriptions)
      expect(result.contentCoverage).toBeGreaterThan(0.8);
      // Content depth: pages have good depth (800 and 600 words), but products have short descriptions
      // So overall depth will be weighted average, which may be lower
      expect(result.contentDepth).toBeGreaterThan(0.3);
      // Freshness should be high (recent dates)
      expect(result.contentFreshness).toBeGreaterThan(0.8);
      // Crawl health should be perfect (all 200 status codes)
      expect(result.crawlHealth).toBe(1);
      // Indexability should be perfect (all pages have required elements)
      expect(result.indexability).toBe(1);
      // SERP presence should be perfect (all pages have title, meta, H1)
      expect(result.serpPresence).toBe(1);
    });

    it('should handle empty project (no pages or products)', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.collectSignalsForProject('proj-1');

      expect(result.contentCoverage).toBe(0);
      expect(result.contentDepth).toBe(0);
      expect(result.contentFreshness).toBe(0);
      expect(result.entityCoverage).toBe(0);
      expect(result.entityAccuracy).toBe(0.5); // Default fallback
      expect(result.entityLinkage).toBe(0);
      expect(result.crawlHealth).toBe(0);
      expect(result.indexability).toBe(0);
      expect(result.serpPresence).toBe(0);
      expect(result.answerSurfacePresence).toBe(0);
      expect(result.brandNavigationalStrength).toBe(0);
    });

    it('should handle pages with missing metadata', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockCrawlResults = [
        {
          id: 'crawl-1',
          projectId: 'proj-1',
          url: 'https://example.com/page1',
          title: null,
          metaDescription: null,
          h1: null,
          wordCount: 500,
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: 'Page 2',
          metaDescription: 'Description 2',
          h1: 'Heading 2',
          wordCount: 600,
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.collectSignalsForProject('proj-1');

      // Content coverage should be lower (only 1 of 2 pages has title)
      expect(result.contentCoverage).toBeLessThan(1);
      // Indexability should be lower (1 page missing metadata)
      expect(result.indexability).toBeLessThan(1);
      // SERP presence should be lower (1 page missing metadata)
      expect(result.serpPresence).toBeLessThan(1);
    });

    it('should handle products with missing SEO metadata', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: null, // No title at all
          seoTitle: null,
          description: 'Product description',
          seoDescription: null, // Missing SEO description
          lastSyncedAt: new Date(),
        },
        {
          id: 'prod-2',
          projectId: 'proj-1',
          title: 'Product 2',
          seoTitle: 'SEO Title 2',
          description: 'Another product description',
          seoDescription: 'SEO Description 2',
          lastSyncedAt: new Date(),
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.collectSignalsForProject('proj-1');

      // Content coverage should be lower (prod-1 has no title source and no seoDescription,
      // so it won't be counted as covered)
      expect(result.contentCoverage).toBeLessThan(1);
    });

    it('should handle thin content (low word counts)', async () => {
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
          wordCount: 50, // Thin content
          statusCode: 200,
          scannedAt: new Date(),
          issues: ['THIN_CONTENT'],
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: 'Page 2',
          metaDescription: 'Description 2',
          h1: 'Heading 2',
          wordCount: 100, // Thin content
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
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
          lastSyncedAt: new Date(),
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.collectSignalsForProject('proj-1');

      // Thin content quality should be lower
      expect(result.thinContentQuality).toBeLessThan(1);
      // HTML structural quality should be lower (thin pages have issues)
      expect(result.htmlStructuralQuality).toBeLessThan(1);
      // Indexability should be lower (thin pages are not indexable)
      expect(result.indexability).toBeLessThan(1);
    });

    it('should handle crawl errors and HTTP errors', async () => {
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
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: null,
          metaDescription: null,
          h1: null,
          wordCount: 0,
          statusCode: 500,
          scannedAt: new Date(),
          issues: ['HTTP_ERROR'],
        },
        {
          id: 'crawl-3',
          projectId: 'proj-1',
          url: 'https://example.com/page3',
          title: null,
          metaDescription: null,
          h1: null,
          wordCount: 0,
          statusCode: 404,
          scannedAt: new Date(),
          issues: ['FETCH_ERROR'],
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.collectSignalsForProject('proj-1');

      // Crawl health should be lower (2 of 3 pages have errors)
      expect(result.crawlHealth).toBeLessThan(1);
      expect(result.crawlHealth).toBeCloseTo(1 / 3, 1);
    });

    it('should handle old content (low freshness)', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const now = Date.now();
      const veryOldDate = new Date(now - 200 * 24 * 60 * 60 * 1000); // 200 days ago

      const mockCrawlResults = [
        {
          id: 'crawl-1',
          projectId: 'proj-1',
          url: 'https://example.com/page1',
          title: 'Page 1',
          metaDescription: 'Description 1',
          h1: 'Heading 1',
          wordCount: 500,
          statusCode: 200,
          scannedAt: veryOldDate,
          issues: [],
        },
      ];

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: 'SEO Title 1',
          description: 'Product description',
          seoDescription: 'SEO Description 1',
          lastSyncedAt: veryOldDate,
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.collectSignalsForProject('proj-1');

      // Freshness should be low (content is very old)
      expect(result.contentFreshness).toBeLessThan(0.5);
    });

    it('should calculate entity signals correctly', async () => {
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
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
          internalLinkCount: 25, // High internal links
        },
      ];

      const mockProducts = [
        {
          id: 'prod-1',
          projectId: 'proj-1',
          title: 'Product 1',
          seoTitle: 'SEO Title 1',
          description: 'Product description with enough words',
          seoDescription: 'SEO Description 1',
          lastSyncedAt: new Date(),
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.collectSignalsForProject('proj-1');

      // Entity hint coverage should be high (pages have title+H1, products have title+description)
      expect(result.entityHintCoverage).toBeGreaterThan(0.8);
      // Entity linkage density should be high (25 internal links)
      expect(result.entityLinkageDensity).toBeGreaterThan(0.5);
    });

    it('should handle navigational pages correctly', async () => {
      const mockProject = {
        id: 'proj-1',
        userId: 'user-1',
      };

      const mockCrawlResults = [
        {
          id: 'crawl-1',
          projectId: 'proj-1',
          url: 'https://example.com/',
          title: 'Home',
          metaDescription: 'Home description',
          h1: 'Home',
          wordCount: 500,
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/about',
          title: 'About',
          metaDescription: 'About description',
          h1: 'About',
          wordCount: 500,
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
        },
        {
          id: 'crawl-3',
          projectId: 'proj-1',
          url: 'https://example.com/contact',
          title: 'Contact',
          metaDescription: 'Contact description',
          h1: 'Contact',
          wordCount: 500,
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.collectSignalsForProject('proj-1');

      // Brand navigational strength should be high (3 navigational pages)
      expect(result.brandNavigationalStrength).toBeGreaterThan(0.5);
    });

    it('should handle answer-ready pages correctly', async () => {
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
          wordCount: 500, // >= 400 words, has H1, no THIN_CONTENT
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: 'Page 2',
          metaDescription: 'Description 2',
          h1: 'Heading 2',
          wordCount: 300, // < 400 words, not answer-ready
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.collectSignalsForProject('proj-1');

      // Answer surface presence should be 0.5 (1 of 2 pages is answer-ready)
      expect(result.answerSurfacePresence).toBe(0.5);
    });

    it('should handle null/undefined word counts gracefully', async () => {
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
          wordCount: null,
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: 'Page 2',
          metaDescription: 'Description 2',
          h1: 'Heading 2',
          wordCount: undefined,
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.collectSignalsForProject('proj-1');

      // Should not throw and should handle null/undefined gracefully
      expect(result).toBeDefined();
      expect(result.contentDepth).toBe(0); // No valid word counts
    });

    it('should handle products with empty or null descriptions', async () => {
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
          description: '',
          seoDescription: '',
          lastSyncedAt: new Date(),
        },
        {
          id: 'prod-2',
          projectId: 'proj-1',
          title: 'Product 2',
          seoTitle: null,
          description: null,
          seoDescription: null,
          lastSyncedAt: new Date(),
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue([]);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.collectSignalsForProject('proj-1');

      // Content coverage should be 0 (no products have both title and description)
      expect(result.contentCoverage).toBe(0);
    });

    it('should calculate entity linkage density from internal links when available', async () => {
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
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
          internalLinkCount: 30, // High internal links
        },
        {
          id: 'crawl-2',
          projectId: 'proj-1',
          url: 'https://example.com/page2',
          title: 'Page 2',
          metaDescription: 'Description 2',
          h1: 'Heading 2',
          wordCount: 600,
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
          internalLinkCount: 25,
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.collectSignalsForProject('proj-1');

      // Entity linkage density should be high (average of 27.5 internal links, capped at 20)
      expect(result.entityLinkageDensity).toBeGreaterThan(0.5);
    });

    it('should fall back to word count for entity linkage when internal links not available', async () => {
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
          wordCount: 1500, // High word count
          statusCode: 200,
          scannedAt: new Date(),
          issues: [],
          // No internalLinkCount
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.crawlResult.findMany.mockResolvedValue(mockCrawlResults);
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.collectSignalsForProject('proj-1');

      // Entity linkage should use word count fallback
      expect(result.entityLinkage).toBeGreaterThan(0);
    });
  });
});

